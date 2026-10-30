const { sequelize } = require('../models');

async function run() {
  try {
    const [cols] = await sequelize.query("SHOW COLUMNS FROM vehicle_master LIKE 'operates_on'");
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE vehicle_master ADD COLUMN operates_on VARCHAR(50) DEFAULT 'Fuel' AFTER vehicle_type");
      console.log('Added operates_on column to vehicle_master');
    } else {
      console.log('operates_on column already exists');
    }

    const [r1] = await sequelize.query("UPDATE vehicle_master SET vehicle_type = 'Backhoe loader' WHERE vehicle_type = 'Back Hoe Coader'");
    console.log('Updated Back Hoe Coader to Backhoe loader:', r1);

    const [r2] = await sequelize.query("UPDATE vehicle_master SET vehicle_type = 'Super Sucker' WHERE vehicle_type = 'Super Saucer'");
    console.log('Updated Super Saucer to Super Sucker:', r2);

    const [r3] = await sequelize.query("UPDATE vehicle_master SET operates_on = 'Fuel' WHERE operates_on IS NULL OR operates_on = ''");
    console.log('Set default operates_on to Fuel:', r3);

    const [check] = await sequelize.query("SELECT id, vehicle_no, vehicle_type, operates_on FROM vehicle_master LIMIT 10");
    console.log('Sample vehicles:', check);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
