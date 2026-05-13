require("dotenv").config();
const { query } = require("./db");

async function migrate() {
  console.log("Starting migration...");
  try {
    const tableInfo = await query("PRAGMA table_info(payrolls)");
    const cols = tableInfo.rows.map((r) => r.name);

    if (!cols.includes("holiday_pay")) {
      await query("ALTER TABLE payrolls ADD COLUMN holiday_pay REAL DEFAULT 0");
      console.log("Added holiday_pay column.");
    }
    if (!cols.includes("apprenticeship_levy")) {
      await query("ALTER TABLE payrolls ADD COLUMN apprenticeship_levy REAL DEFAULT 0");
      console.log("Added apprenticeship_levy column.");
    }
    if (!cols.includes("employer_pension")) {
      await query("ALTER TABLE payrolls ADD COLUMN employer_pension REAL DEFAULT 0");
      console.log("Added employer_pension column.");
    }
    if (!cols.includes("student_loan_type")) {
      await query("ALTER TABLE payrolls ADD COLUMN student_loan_type TEXT DEFAULT 'None'");
      console.log("Added student_loan_type column.");
    }
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate().then(() => process.exit(0)).catch(console.error);
