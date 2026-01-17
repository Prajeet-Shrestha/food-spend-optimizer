import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { RecordType, BoughtBy } from '../types';
import { Settings } from '../lib/config';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DB_NAME = 'food_spend_optimizer';
const COLLECTION_NAME = 'logs';
const SETTINGS_COLLECTION_NAME = 'settings';
const SETTINGS_DOC_ID = 'app_settings';

// Real data provided by user
const realData = {
  settings: {
    baseFee: 625,
    baselineDailyLow: 360,
    baselineDailyHigh: 400,
    baselineDailyAvg: 380,
    trackingStartDate: '2025-11-01',
  },
 
  logs:[
      {
        _id: 'log_017',
        recordType: 'PAYMENT',
        date: '2025-12-01',
        amountPaid: 4620,
        method: 'Cash',
        remarks: 'Full settlement till Nov end',
        createdAt: '2025-12-01T10:00:00Z',
      },
      {
        _id: 'log_018',
        recordType: 'PAYMENT',
        date: '2025-12-01',
        amountPaid: 380,
        method: 'Cash',
        remarks: 'Tip',
        createdAt: '2025-12-01T10:05:00Z',
      },
      {
        _id: 'log_019',
        recordType: 'PAYMENT',
        date: '2025-12-03',
        amountPaid: 900,
        method: 'Cash',
        remarks: 'Payment',
        createdAt: '2025-12-03T10:00:00Z',
      },
      {
        _id: 'log_020',
        recordType: 'PAYMENT',
        date: '2025-12-06',
        amountPaid: 780,
        method: 'Cash',
        remarks: 'Payment',
        createdAt: '2025-12-06T10:00:00Z',
      },
      {
        _id: 'log_021',
        recordType: 'PAYMENT',
        date: '2025-12-14',
        amountPaid: 770,
        method: 'Cash',
        remarks: 'Payment',
        createdAt: '2025-12-14T10:00:00Z',
      },
    
    {
      _id: 'log_001',
      recordType: 'COOK',
      date: '2025-11-01',
      menu: 'Rice, Meat, Alu',
      baseFee: 625,
      notes: 'First cook',
      createdAt: '2025-11-01T08:00:00Z',
    },
    {
      _id: 'log_002',
      recordType: 'COOK',
      date: '2025-11-05',
      menu: 'Rice, Meat, Alu, Dal',
      baseFee: 625,
      notes: '',
      createdAt: '2025-11-05T08:00:00Z',
    },
    {
      _id: 'log_003',
      recordType: 'COOK',
      date: '2025-11-09',
      menu: 'Rice, Meat, Alu, Dal',
      baseFee: 625,
      notes: '',
      createdAt: '2025-11-09T08:00:00Z',
    },
    {
      _id: 'log_004',
      recordType: 'COOK',
      date: '2025-11-24',
      menu: 'Rice, Vindi, Dal, Alu',
      baseFee: 625,
      notes: '',
      createdAt: '2025-11-24T08:00:00Z',
    },
    {
      _id: 'log_005',
      recordType: 'COOK',
      date: '2025-11-27',
      menu: 'Rice, Dal, Masu and Alu',
      baseFee: 625,
      notes: '',
      createdAt: '2025-11-27T08:00:00Z',
    },
    {
      _id: 'log_006',
      recordType: 'COOK',
      date: '2025-11-30',
      menu: 'Rice, Vindi, Dal, Alu',
      baseFee: 625,
      notes: '',
      createdAt: '2025-11-30T08:00:00Z',
    },
    {
      _id: 'log_007',
      recordType: 'COOK',
      date: '2025-12-03',
      menu: 'Rice, Masu, Dal, Alu, Cauli',
      baseFee: 625,
      notes: '',
      createdAt: '2025-12-03T08:00:00Z',
    },
    {
      _id: 'log_008',
      recordType: 'COOK',
      date: '2025-12-06',
      menu: 'Roast, Rice, Dal, Saag',
      baseFee: 625,
      notes: '',
      createdAt: '2025-12-06T08:00:00Z',
    },
    {
      _id: 'log_009',
      recordType: 'COOK',
      date: '2025-12-10',
      menu: 'Rice, Dal, Saag and meat',
      baseFee: 625,
      notes: '',
      createdAt: '2025-12-10T08:00:00Z',
    },
    {
      _id: 'log_010',
      recordType: 'COOK',
      date: '2025-12-14',
      menu: 'Dal, Paneer, Alu',
      baseFee: 625,
      notes: '',
      createdAt: '2025-12-14T08:00:00Z',
    },
      {
        _id: 'log_011',
        recordType: 'GROCERY',
        date: '2025-11-27',
        category: 'Meat',
        amount: 750,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-11-27T09:00:00Z',
      },
      {
        _id: 'log_012',
        recordType: 'GROCERY',
        date: '2025-11-30',
        category: 'Sag, Vindi',
        amount: 120,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-11-30T09:00:00Z',
      },
      {
        _id: 'log_013',
        recordType: 'GROCERY',
        date: '2025-12-03',
        category: 'Meat, Veggies',
        amount: 900,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-12-03T09:00:00Z',
      },
      {
        _id: 'log_014',
        recordType: 'GROCERY',
        date: '2025-12-06',
        category: 'Meat, Veggies',
        amount: 780,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-12-06T09:00:00Z',
      },
      {
        _id: 'log_015',
        recordType: 'GROCERY',
        date: '2025-12-10',
        category: 'Veggies',
        amount: 200,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-12-10T09:00:00Z',
      },
      {
        _id: 'log_016',
        recordType: 'GROCERY',
        date: '2025-12-14',
        category: 'Groceries',
        amount: 770,
        boughtBy: 'STAFF',
        reimbursable: true,
        createdAt: '2025-12-14T09:00:00Z',
      },
    ]

};

/**
 * Calculate days food lasted for a cook log based on previous cook date
 */
function calculateDaysFoodLasted(
  cookDate: string,
  previousCookDate: string | null
): number | undefined {
  if (!previousCookDate) {
    return undefined; // First cook log, can't calculate
  }

  const current = new Date(cookDate);
  const previous = new Date(previousCookDate);
  const diffTime = current.getTime() - previous.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : undefined;
}

async function insertRealData() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env.local');
    console.error('Please create .env.local file with your MongoDB connection string');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const logsCollection = db.collection(COLLECTION_NAME);
    const settingsCollection = db.collection(SETTINGS_COLLECTION_NAME);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await logsCollection.deleteMany({});
    await settingsCollection.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert settings
    console.log('⚙️  Inserting settings...');
    const settings: Settings = realData.settings;
    await settingsCollection.updateOne(
      { _id: SETTINGS_DOC_ID },
      {
        $set: {
          ...settings,
          _id: SETTINGS_DOC_ID,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    console.log('✅ Settings inserted:', settings);

    // Process logs: calculate daysFoodLasted for cook logs
    console.log('📝 Processing logs...');
    const processedLogs: any[] = [];
    const cookLogs: Array<{ date: string; [key: string]: any }> = [];

    // First pass: collect cook logs to calculate daysFoodLasted
    for (const log of realData.logs) {
      if (log.recordType === RecordType.COOK) {
        cookLogs.push({
          date: log.date,
          ...log,
        });
      }
    }

    // Sort cook logs by date
    cookLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Second pass: process all logs and add daysFoodLasted to cook logs
    for (const log of realData.logs) {
      const processedLog: any = { ...log };

      // Remove the _id field (MongoDB will auto-generate)
      delete processedLog._id;

      // Add updatedAt if not present
      if (!processedLog.updatedAt) {
        processedLog.updatedAt = processedLog.createdAt;
      }

      // Process cook logs: calculate daysFoodLasted
      if (log.recordType === RecordType.COOK) {
        const cookIndex = cookLogs.findIndex((c) => c.date === log.date);
        const previousCook = cookIndex > 0 ? cookLogs[cookIndex - 1] : null;
        processedLog.daysFoodLasted = calculateDaysFoodLasted(
          log.date,
          previousCook ? previousCook.date : null
        );
      }

      // Process grocery logs: ensure reimbursable is set correctly
      if (log.recordType === RecordType.GROCERY) {
        processedLog.reimbursable = log.boughtBy === BoughtBy.STAFF;
      }

      processedLogs.push(processedLog);
    }

    // Sort logs by date and createdAt for consistent insertion
    processedLogs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Insert logs
    console.log(`📝 Inserting ${processedLogs.length} log entries...`);
    const cookCount = processedLogs.filter((l) => l.recordType === RecordType.COOK).length;
    const groceryCount = processedLogs.filter((l) => l.recordType === RecordType.GROCERY).length;
    const paymentCount = processedLogs.filter((l) => l.recordType === RecordType.PAYMENT).length;

    console.log(`   - ${cookCount} Cook logs`);
    console.log(`   - ${groceryCount} Grocery logs`);
    console.log(`   - ${paymentCount} Payment logs`);

    await logsCollection.insertMany(processedLogs);
    console.log('✅ Logs inserted');

    // Create indexes
    console.log('📊 Creating indexes...');
    await logsCollection.createIndex({ date: 1 });
    await logsCollection.createIndex({ recordType: 1 });
    await logsCollection.createIndex({ recordType: 1, date: -1 });
    console.log('✅ Indexes created');

    // Show summary
    const totalCook = await logsCollection.countDocuments({ recordType: RecordType.COOK });
    const totalGrocery = await logsCollection.countDocuments({ recordType: RecordType.GROCERY });
    const totalPayment = await logsCollection.countDocuments({ recordType: RecordType.PAYMENT });

    console.log('\n📊 Summary:');
    console.log(`   ✅ ${totalCook} Cook logs`);
    console.log(`   ✅ ${totalGrocery} Grocery logs`);
    console.log(`   ✅ ${totalPayment} Payment logs`);
    console.log(`   ✅ ${totalCook + totalGrocery + totalPayment} Total logs`);
    console.log('   ✅ Settings configured');

    // Show cook logs with daysFoodLasted
    const cookLogsWithDays = await logsCollection
      .find({ recordType: RecordType.COOK })
      .sort({ date: 1 })
      .toArray();
    console.log('\n🍳 Cook Sessions:');
    for (const cookLog of cookLogsWithDays) {
      const daysInfo = cookLog.daysFoodLasted
        ? ` (lasted ${cookLog.daysFoodLasted} days)`
        : ' (first cook)';
      console.log(
        `   - ${cookLog.date}: ${cookLog.menu}${daysInfo}`
      );
    }

    console.log('\n🎉 Real data inserted successfully!');
    console.log('   You can now view the data in your dashboard at http://localhost:3000');
  } catch (error) {
    console.error('❌ Error inserting real data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
insertRealData().catch(console.error);

