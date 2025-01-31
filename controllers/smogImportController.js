/**
 * controllers/smogImportController.js
 *
 * **Production Secure API Controller with Encoding Conversion**
 *
 * - **Purpose**: Receive encrypted data, decrypt, decompress, ensure UTF-8 encoding (especially for the 'clinic' field),
 *   sanitize, validate, and insert into the database.
 * - **Features**:
 *   - Converts 'clinic' field from potential incorrect encoding (e.g., Windows-874) to UTF-8.
 *   - Uses `iconv-lite` for encoding conversion.
 *   - Ensures database connection uses UTF-8 (`utf8mb4`).
 *   - Implements robust error handling and logging.
 *   - Compatible with Laragon and XAMPP environments.
 *
 * **Prerequisites**:
 * - Install `iconv-lite`:
 *   ```bash
 *   npm install iconv-lite
 *   ```
 */

const zlib = require("zlib");
const {
  getSmogImportRecords,
  insertSmogImport,
  insertApiImport,
} = require("../models/smogImportModel");
const smogImportSchema = require("../validation/smogImportValidation");
const cleanDiagcode = require("../helpers/cleanDiagcode");
const db = require("../config/db");
const crypto = require("crypto");
const util = require("util");
const iconv = require("iconv-lite"); // Import iconv-lite for encoding conversion

// Promisify gunzip for async/await
const gunzip = util.promisify(zlib.gunzip);

/**
 * Function to decrypt data using AES-256-CBC
 *
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @returns {Buffer} - Decrypted data as Buffer
 * @throws {Error} - If decryption fails
 */
const decryptData = (encryptedBase64) => {
  try {
    const encryptedData = Buffer.from(encryptedBase64, "base64");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(process.env.ENCRYPTION_KEY, "utf-8"),
      Buffer.from(process.env.ENCRYPTION_IV, "utf-8")
    );
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  } catch (error) {
    console.error(
      "Decryption error:",
      error,
      "Encrypted Data:",
      encryptedBase64
    );
    throw new Error("Decryption failed.");
  }
};

/**
 * Function to convert string from Windows-874 to UTF-8
 *
 * @param {string} rawStr - String in Windows-874 encoding
 * @returns {string} - String converted to UTF-8
 */
const convertWin874toUTF8 = (rawStr) => {
  try {
    // Convert the raw string to a buffer assuming 'binary' encoding
    const buf = Buffer.from(rawStr, "binary");
    // Decode the buffer from Windows-874 to UTF-8
    return iconv.decode(buf, "win874");
  } catch (error) {
    console.error(
      "Encoding conversion error for string:",
      rawStr,
      "Error:",
      error
    );
    throw new Error("Encoding conversion failed.");
  }
};

/**
 * Function to ensure all string data is properly encoded in UTF-8
 *
 * @param {any} data - The data to process (can be nested)
 * @returns {any} - Data with all strings converted to UTF-8
 */
const ensureUtf8 = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => ensureUtf8(item));
  } else if (typeof data === "object" && data !== null) {
    const newObj = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        newObj[key] = ensureUtf8(data[key]);
      }
    }
    return newObj;
  } else if (typeof data === "string") {
    try {
      // ตรวจสอบว่าชุดอักขระเป็น UTF-8 หรือไม่
      // หากไม่แน่ใจ สามารถปรับเปลี่ยนเงื่อนไขได้ตามแหล่งข้อมูล
      if (iconv.encodingExists("utf8") && !iconv.encodingExists("utf8mb4")) {
        // แปลงจาก Windows-874 เป็น UTF-8
        return convertWin874toUTF8(data);
      }
      // หากต้องแปลงจากชุดอักขระอื่น เช่น TIS-620:
      // return iconv.decode(Buffer.from(data, 'binary'), 'tis-620');
      return data;
    } catch (error) {
      console.error(
        "UTF-8 encoding enforcement error for data:",
        data,
        "Error:",
        error
      );
      return data; // หรือสามารถโยนข้อผิดพลาดได้ตามต้องการ
    }
  }
  return data;
};

/**
 * Handler for importing smog data
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSmogImport = async (req, res) => {
  const encryptedData = req.body.data;
  const method = req.body.method || 0;

  let decryptedCompressedData;
  try {
    decryptedCompressedData = decryptData(encryptedData);
  } catch (decryptErr) {
    // Error already loggedในฟังก์ชัน decryptData
    return res.status(400).json({ message: "Decryption failed." });
  }

  let decompressedData;
  try {
    decompressedData = await gunzip(decryptedCompressedData);
  } catch (decompressErr) {
    console.error(
      "Decompression error:",
      decompressErr,
      "Decrypted Data:",
      decryptedCompressedData
    );
    return res.status(400).json({ message: "Decompression failed." });
  }

  let data;
  try {
    data = JSON.parse(decompressedData.toString());
  } catch (parseErr) {
    console.error(
      "JSON parsing error:",
      parseErr,
      "Decompressed Data:",
      decompressedData.toString()
    );
    return res.status(400).json({ message: "Invalid JSON data." });
  }

  if (!Array.isArray(data)) {
    console.error(
      "Invalid data format: Data is not an array.",
      "Received Data:",
      data
    );
    return res
      .status(400)
      .json({ message: "Data should be an array of records." });
  }

  // Ensure all strings are in UTF-8 encoding
  data = ensureUtf8(data);

  // Validate and clean each record
  const validRecords = [];
  for (let record of data) {
    // --- Important: Convert 'clinic' field from Windows-874 to UTF-8 ---
    if (record.clinic) {
      try {
        // ถ้าใช้ฟังก์ชัน convertWin874toUTF8
        // record.clinic = convertWin874toUTF8(record.clinic);

        // หากสงสัยว่าชุดอักขระเป็น TIS-620:
        record.clinic = iconv.decode(
          Buffer.from(record.clinic, "binary"),
          "tis-620"
        );
      } catch (encodingErr) {
        console.error(
          "Clinic field encoding error for record:",
          record,
          "Error:",
          encodingErr
        );
        return res
          .status(400)
          .json({ message: "Clinic field encoding conversion failed." });
      }
    }

    // Clean diagcode
    if (record.diagcode) {
      try {
        record.diagcode = cleanDiagcode(record.diagcode);
      } catch (cleanErr) {
        console.error(
          "Diagcode cleaning error for record:",
          record,
          "Error:",
          cleanErr
        );
        return res.status(400).json({ message: "Diagcode cleaning failed." });
      }
    }

    // Validate using Joi schema
    const { error, value } = smogImportSchema.validate(record);
    if (error) {
      console.error(
        `Validation error for record: ${JSON.stringify(record)} - ${
          error.details[0].message
        }`
      );
      return res
        .status(400)
        .json({ message: `Validation error: ${error.details[0].message}` });
    }

    // Prepare record for bulk insert
    validRecords.push([
      value.hospcode,
      value.pid,
      value.birth,
      value.sex,
      value.addrcode,
      value.hn,
      value.seq,
      value.date_serv,
      value.diagtype,
      value.diagcode,
      value.clinic,
      value.provider,
      value.d_update,
      value.cid,
      value.appoint,
      value.admit,
      value.er,
    ]);
  }

  const recordCount = validRecords.length;
  const hospcode = req.user.hospcode;

  // ตรวจสอบว่ามีข้อมูลที่จะทำการ INSERT หรือไม่
  if (recordCount === 0) {
    console.warn("No valid records to insert.");
    return res.status(400).json({ message: "No valid records to import." });
  }

  try {
    // Start transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Insert smog_import records
      const insertSmogSql = `
        INSERT INTO smog_import 
        (hospcode, pid, birth, sex, addrcode, hn, seq, date_serv, diagtype, diagcode, clinic, provider, d_update, cid, appoint,admit,er)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
        birth = VALUES(birth),
        sex = VALUES(sex),
        addrcode = VALUES(addrcode),
        hn = VALUES(hn),
        seq = VALUES(seq),
        date_serv = VALUES(date_serv),
        diagtype = VALUES(diagtype),
        diagcode = VALUES(diagcode),
        clinic = VALUES(clinic),
        provider = VALUES(provider),
        d_update = VALUES(d_update),
        cid = VALUES(cid),
        appoint = VALUES(appoint),
        admit = VALUES(admit),
        er = VALUES(er);
      `;
      await connection.query(insertSmogSql, [validRecords]);

      // Insert api_imports record
      const insertApiImportsSql = `
        INSERT INTO api_imports (hospcode, method, rec)
        VALUES (?, ?, ?)
      `;
      await connection.query(insertApiImportsSql, [
        hospcode,
        method,
        recordCount,
      ]);

      await connection.commit();
      connection.release();

      res.json({
        message: "Data received and stored successfully.",
        records_imported: recordCount,
      });
    } catch (dbErr) {
      await connection.rollback();
      connection.release();
      console.error(
        "Database transaction error:",
        dbErr,
        "Valid Records:",
        validRecords
      );
      res.status(500).json({ message: "Internal server error." });
    }
  } catch (connErr) {
    console.error("Database connection error:", connErr);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Handler to get smog import records
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSmogImportRecordsHandler = async (req, res) => {
  const { hospcode } = req.user;

  try {
    const records = await getSmogImportRecords(hospcode);
    res.json(records);
  } catch (err) {
    console.error(
      "Error fetching smog import records:",
      err,
      "Hospcode:",
      hospcode
    );
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  handleSmogImport,
  getSmogImportRecordsHandler,
};
