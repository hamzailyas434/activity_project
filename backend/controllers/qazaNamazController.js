const db = require("../config/database");

// Get Qaza Namaz data for current user
exports.getQazaNamaz = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if table exists, if not return empty data
    try {
      const [results] = await db.query(
        "SELECT * FROM qaza_namaz WHERE user_id = ?",
        [userId]
      );

      if (results.length === 0) {
        // Return empty data structure if no record exists
        return res.json({
          Fajr: "",
          Zuhr: "",
          Asr: "",
          Maghrib: "",
          Isha: "",
          adjustments: {
            Fajr: 0,
            Zuhr: 0,
            Asr: 0,
            Maghrib: 0,
            Isha: 0,
          },
        });
      }

      const data = results[0];
      // Transform database structure to frontend format
      const response = {
        Fajr: data.fajr_years ? data.fajr_years.toString() : "",
        Zuhr: data.zuhr_years ? data.zuhr_years.toString() : "",
        Asr: data.asr_years ? data.asr_years.toString() : "",
        Maghrib: data.maghrib_years ? data.maghrib_years.toString() : "",
        Isha: data.isha_years ? data.isha_years.toString() : "",
        adjustments: {
          Fajr: data.fajr_adjustment || 0,
          Zuhr: data.zuhr_adjustment || 0,
          Asr: data.asr_adjustment || 0,
          Maghrib: data.maghrib_adjustment || 0,
          Isha: data.isha_adjustment || 0,
        },
        updated_at: data.updated_at || null,
        namaz_updated_at: {
          Fajr: data.fajr_updated_at || data.updated_at || null,
          Zuhr: data.zuhr_updated_at || data.updated_at || null,
          Asr: data.asr_updated_at || data.updated_at || null,
          Maghrib: data.maghrib_updated_at || data.updated_at || null,
          Isha: data.isha_updated_at || data.updated_at || null,
        },
      };

      res.json(response);
    } catch (tableError) {
      // If table doesn't exist, return empty data
      if (tableError.code === "ER_NO_SUCH_TABLE") {
        console.log("Qaza Namaz table does not exist yet. Please run the migration script.");
        return res.json({
          Fajr: "",
          Zuhr: "",
          Asr: "",
          Maghrib: "",
          Isha: "",
          adjustments: {
            Fajr: 0,
            Zuhr: 0,
            Asr: 0,
            Maghrib: 0,
            Isha: 0,
          },
        });
      }
      throw tableError;
    }
  } catch (error) {
    console.error("Error fetching Qaza Namaz:", error);
    res.status(500).json({ error: "Failed to fetch Qaza Namaz data." });
  }
};

// Save Qaza Namaz data
exports.saveQazaNamaz = async (req, res) => {
  try {
    const userId = req.user.id;
    const { Fajr, Zuhr, Asr, Maghrib, Isha, adjustments } = req.body;

    // Calculate days and qaza for each Namaz
    const calculateDays = (years) => {
      return years ? Math.floor(parseFloat(years) * 365) : 0;
    };

    const calculateQaza = (days) => {
      return days * 1; // Multiply by 1 as per requirement
    };

    const fajrYears = Fajr ? parseFloat(Fajr) : 0;
    const zuhrYears = Zuhr ? parseFloat(Zuhr) : 0;
    const asrYears = Asr ? parseFloat(Asr) : 0;
    const maghribYears = Maghrib ? parseFloat(Maghrib) : 0;
    const ishaYears = Isha ? parseFloat(Isha) : 0;

    const fajrDays = calculateDays(Fajr);
    const zuhrDays = calculateDays(Zuhr);
    const asrDays = calculateDays(Asr);
    const maghribDays = calculateDays(Maghrib);
    const ishaDays = calculateDays(Isha);

    const fajrQaza = calculateQaza(fajrDays);
    const zuhrQaza = calculateQaza(zuhrDays);
    const asrQaza = calculateQaza(asrDays);
    const maghribQaza = calculateQaza(maghribDays);
    const ishaQaza = calculateQaza(ishaDays);

    // Get adjustments (default to 0 if not provided)
    const adjustmentsData = adjustments || {};
    const fajrAdjustment = adjustmentsData.Fajr || 0;
    const zuhrAdjustment = adjustmentsData.Zuhr || 0;
    const asrAdjustment = adjustmentsData.Asr || 0;
    const maghribAdjustment = adjustmentsData.Maghrib || 0;
    const ishaAdjustment = adjustmentsData.Isha || 0;

    // Check if record exists and get current values
    const [existing] = await db.query(
      "SELECT * FROM qaza_namaz WHERE user_id = ?",
      [userId]
    );

    // Build update query with individual timestamps
    const now = new Date();
    const updateFields = [];
    const updateValues = [];
    
    // Helper function to check if values changed
    const hasChanged = (oldVal, newVal) => {
      const oldNum = parseFloat(oldVal) || 0;
      const newNum = parseFloat(newVal) || 0;
      return Math.abs(oldNum - newNum) > 0.001;
    };

    if (existing.length > 0) {
      const current = existing[0];
      
      // Update all fields, but only update individual timestamps when values actually change
      updateFields.push("fajr_years = ?, fajr_days = ?, fajr_qaza = ?, fajr_adjustment = ?");
      updateValues.push(fajrYears, fajrDays, fajrQaza, fajrAdjustment);
      if (hasChanged(current.fajr_years, fajrYears) || hasChanged(current.fajr_adjustment, fajrAdjustment)) {
        updateFields.push("fajr_updated_at = CURRENT_TIMESTAMP");
      }
      
      updateFields.push("zuhr_years = ?, zuhr_days = ?, zuhr_qaza = ?, zuhr_adjustment = ?");
      updateValues.push(zuhrYears, zuhrDays, zuhrQaza, zuhrAdjustment);
      if (hasChanged(current.zuhr_years, zuhrYears) || hasChanged(current.zuhr_adjustment, zuhrAdjustment)) {
        updateFields.push("zuhr_updated_at = CURRENT_TIMESTAMP");
      }
      
      updateFields.push("asr_years = ?, asr_days = ?, asr_qaza = ?, asr_adjustment = ?");
      updateValues.push(asrYears, asrDays, asrQaza, asrAdjustment);
      if (hasChanged(current.asr_years, asrYears) || hasChanged(current.asr_adjustment, asrAdjustment)) {
        updateFields.push("asr_updated_at = CURRENT_TIMESTAMP");
      }
      
      updateFields.push("maghrib_years = ?, maghrib_days = ?, maghrib_qaza = ?, maghrib_adjustment = ?");
      updateValues.push(maghribYears, maghribDays, maghribQaza, maghribAdjustment);
      if (hasChanged(current.maghrib_years, maghribYears) || hasChanged(current.maghrib_adjustment, maghribAdjustment)) {
        updateFields.push("maghrib_updated_at = CURRENT_TIMESTAMP");
      }
      
      updateFields.push("isha_years = ?, isha_days = ?, isha_qaza = ?, isha_adjustment = ?");
      updateValues.push(ishaYears, ishaDays, ishaQaza, ishaAdjustment);
      if (hasChanged(current.isha_years, ishaYears) || hasChanged(current.isha_adjustment, ishaAdjustment)) {
        updateFields.push("isha_updated_at = CURRENT_TIMESTAMP");
      }

      updateValues.push(userId);
      
      // Update existing record
      try {
        await db.query(
          `UPDATE qaza_namaz SET ${updateFields.join(", ")} WHERE user_id = ?`,
          updateValues
        );
      } catch (updateError) {
        // If columns don't exist, silently continue (columns will be added via migration)
        if (updateError.code === "ER_BAD_FIELD_ERROR" || updateError.code === "42S22") {
          console.log("Individual timestamp columns don't exist yet. Please run: node scripts/add_individual_namaz_timestamps.js");
          // Fallback: Update without individual timestamps
          await db.query(
            `UPDATE qaza_namaz SET
              fajr_years = ?, fajr_days = ?, fajr_qaza = ?, fajr_adjustment = ?,
              zuhr_years = ?, zuhr_days = ?, zuhr_qaza = ?, zuhr_adjustment = ?,
              asr_years = ?, asr_days = ?, asr_qaza = ?, asr_adjustment = ?,
              maghrib_years = ?, maghrib_days = ?, maghrib_qaza = ?, maghrib_adjustment = ?,
              isha_years = ?, isha_days = ?, isha_qaza = ?, isha_adjustment = ?
            WHERE user_id = ?`,
            [
              fajrYears, fajrDays, fajrQaza, fajrAdjustment,
              zuhrYears, zuhrDays, zuhrQaza, zuhrAdjustment,
              asrYears, asrDays, asrQaza, asrAdjustment,
              maghribYears, maghribDays, maghribQaza, maghribAdjustment,
              ishaYears, ishaDays, ishaQaza, ishaAdjustment,
              userId
            ]
          );
        } else {
          throw updateError;
        }
      }
    } else {
      // Insert new record with initial timestamps
      await db.query(
        `INSERT INTO qaza_namaz (
          user_id,
          fajr_years, fajr_days, fajr_qaza, fajr_adjustment, fajr_updated_at,
          zuhr_years, zuhr_days, zuhr_qaza, zuhr_adjustment, zuhr_updated_at,
          asr_years, asr_days, asr_qaza, asr_adjustment, asr_updated_at,
          maghrib_years, maghrib_days, maghrib_qaza, maghrib_adjustment, maghrib_updated_at,
          isha_years, isha_days, isha_qaza, isha_adjustment, isha_updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userId,
          fajrYears,
          fajrDays,
          fajrQaza,
          fajrAdjustment,
          zuhrYears,
          zuhrDays,
          zuhrQaza,
          zuhrAdjustment,
          asrYears,
          asrDays,
          asrQaza,
          asrAdjustment,
          maghribYears,
          maghribDays,
          maghribQaza,
          maghribAdjustment,
          ishaYears,
          ishaDays,
          ishaQaza,
          ishaAdjustment,
        ]
      );
    }

    // Get updated record to return all timestamps
    const [updated] = await db.query(
      "SELECT updated_at, fajr_updated_at, zuhr_updated_at, asr_updated_at, maghrib_updated_at, isha_updated_at FROM qaza_namaz WHERE user_id = ?",
      [userId]
    );

    const updatedData = updated[0] || {};
    res.json({ 
      message: "Qaza Namaz data saved successfully",
      updated_at: updatedData.updated_at || null,
      namaz_updated_at: {
        Fajr: updatedData.fajr_updated_at || updatedData.updated_at || null,
        Zuhr: updatedData.zuhr_updated_at || updatedData.updated_at || null,
        Asr: updatedData.asr_updated_at || updatedData.updated_at || null,
        Maghrib: updatedData.maghrib_updated_at || updatedData.updated_at || null,
        Isha: updatedData.isha_updated_at || updatedData.updated_at || null,
      }
    });
  } catch (error) {
    console.error("Error saving Qaza Namaz:", error);
    
    // Check if table doesn't exist
    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ 
        error: "Qaza Namaz table does not exist. Please run the migration script: node scripts/add_qaza_namaz.js",
        code: "TABLE_NOT_FOUND"
      });
    }
    
    res.status(500).json({ error: "Failed to save Qaza Namaz data." });
  }
};

