import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { RecordType, BoughtBy } from '../types';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DB_NAME = 'food_spend_optimizer';
const COLLECTION_NAME = 'logs';

// Sample data configuration
const BASE_FEE = 500; // Rs 500 per cooking session
const DAYS_BACK = 30; // Generate data for last 30 days

interface SampleCookLog {
  recordType: RecordType.COOK;
  date: string;
  menu: string;
  baseFee: number;
  daysFoodLasted?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SampleGroceryLog {
  recordType: RecordType.GROCERY;
  date: string;
  category: string;
  amount: number;
  boughtBy: BoughtBy;
  reimbursable: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SamplePaymentLog {
  recordType: RecordType.PAYMENT;
  date: string;
  amountPaid: number;
  method: string;
  remarks?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getTimestamp(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10 + Math.floor(Math.random() * 8)); // Random hour between 10-18
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

async function insertSampleData() {
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
    const collection = db.collection(COLLECTION_NAME);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing logs...');
    await collection.deleteMany({});
    console.log('✅ Cleared existing logs');

    const logs: (SampleCookLog | SampleGroceryLog | SamplePaymentLog)[] = [];

    // Generate Cook Logs (every 3-4 days)
    const cookMenus = [
      'Dal, Rice, Vegetables, Pickle',
      'Chicken Curry, Rice, Vegetables',
      'Mutton Curry, Rice, Salad',
      'Dal, Roti, Vegetables, Yogurt',
      'Fish Curry, Rice, Vegetables',
      'Dal, Rice, Saag, Pickle',
      'Chicken Biryani, Raita',
      'Dal, Rice, Mixed Vegetables',
    ];

    let lastCookDate: number | null = null;
    for (let i = DAYS_BACK; i >= 0; i--) {
      // Cook every 3-4 days
      if (lastCookDate === null || (lastCookDate - i) >= 3) {
        const dateStr = getDateString(i);
        const timestamp = getTimestamp(i);
        const menu = cookMenus[Math.floor(Math.random() * cookMenus.length)];
        
        const cookLog: SampleCookLog = {
          recordType: RecordType.COOK,
          date: dateStr,
          menu,
          baseFee: BASE_FEE,
          daysFoodLasted: lastCookDate !== null ? lastCookDate - i : undefined,
          notes: i % 7 === 0 ? 'Extra portion prepared' : undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        logs.push(cookLog);
        lastCookDate = i;
      }
    }

    // Generate Grocery Logs (randomly, some before cook dates)
    const groceryCategories = [
      { name: 'Meat', amountRange: [800, 1500], staffRatio: 0.8 },
      { name: 'Veggies', amountRange: [200, 500], staffRatio: 0.7 },
      { name: 'Saag', amountRange: [100, 300], staffRatio: 0.6 },
      { name: 'Spices', amountRange: [150, 400], staffRatio: 0.5 },
      { name: 'Rice', amountRange: [300, 600], staffRatio: 0.4 },
      { name: 'Dal', amountRange: [200, 400], staffRatio: 0.5 },
    ];

    // Add groceries on random days (about 2-3 per week)
    for (let i = DAYS_BACK; i >= 0; i--) {
      if (Math.random() < 0.3) { // 30% chance per day
        const category = groceryCategories[Math.floor(Math.random() * groceryCategories.length)];
        const amount = Math.floor(
          category.amountRange[0] + 
          Math.random() * (category.amountRange[1] - category.amountRange[0])
        );
        const boughtBy = Math.random() < category.staffRatio ? BoughtBy.STAFF : BoughtBy.ME;
        const dateStr = getDateString(i);
        const timestamp = getTimestamp(i);

        const groceryLog: SampleGroceryLog = {
          recordType: RecordType.GROCERY,
          date: dateStr,
          category: category.name,
          amount,
          boughtBy,
          reimbursable: boughtBy === BoughtBy.STAFF,
          notes: Math.random() < 0.3 ? `Fresh ${category.name.toLowerCase()}` : undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        logs.push(groceryLog);
      }
    }

    // Generate Payment Logs (every 10-15 days)
    const paymentMethods = ['Cash', 'Bank Transfer', 'UPI', 'Mobile Banking'];
    let lastPaymentDate: number | null = null;
    
    for (let i = DAYS_BACK; i >= 0; i--) {
      if (lastPaymentDate === null || (lastPaymentDate - i) >= 12) {
        const dateStr = getDateString(i);
        const timestamp = getTimestamp(i);
        
        // Calculate approximate amount due at this point
        // (simplified - in real app this would be calculated)
        const amountPaid = Math.floor(2000 + Math.random() * 1500); // Rs 2000-3500
        
        const paymentLog: SamplePaymentLog = {
          recordType: RecordType.PAYMENT,
          date: dateStr,
          amountPaid,
          method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          remarks: `Payment for period ending ${dateStr}`,
          notes: Math.random() < 0.5 ? 'Partial payment' : undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        logs.push(paymentLog);
        lastPaymentDate = i;
      }
    }

    // Sort logs by date
    logs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // If same date, order: COOK, GROCERY, PAYMENT
      const order = { [RecordType.COOK]: 0, [RecordType.GROCERY]: 1, [RecordType.PAYMENT]: 2 };
      return order[a.recordType] - order[b.recordType];
    });

    // Recalculate daysFoodLasted for cook logs
    const cookLogs = logs.filter(log => log.recordType === RecordType.COOK) as SampleCookLog[];
    for (let i = 0; i < cookLogs.length; i++) {
      if (i > 0) {
        const prevDate = new Date(cookLogs[i - 1].date);
        const currDate = new Date(cookLogs[i].date);
        const diffDays = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        cookLogs[i].daysFoodLasted = diffDays;
      }
    }

    console.log(`📝 Inserting ${logs.length} log entries...`);
    console.log(`   - ${cookLogs.length} Cook logs`);
    console.log(`   - ${logs.filter(l => l.recordType === RecordType.GROCERY).length} Grocery logs`);
    console.log(`   - ${logs.filter(l => l.recordType === RecordType.PAYMENT).length} Payment logs`);

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      await collection.insertMany(batch as any);
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(logs.length / batchSize)}`);
    }

    // Create indexes
    console.log('📊 Creating indexes...');
    await collection.createIndex({ date: 1 });
    await collection.createIndex({ recordType: 1 });
    await collection.createIndex({ recordType: 1, date: -1 });
    console.log('✅ Indexes created');

    // Show summary
    const totalCook = await collection.countDocuments({ recordType: RecordType.COOK });
    const totalGrocery = await collection.countDocuments({ recordType: RecordType.GROCERY });
    const totalPayment = await collection.countDocuments({ recordType: RecordType.PAYMENT });

    console.log('\n📊 Summary:');
    console.log(`   ✅ ${totalCook} Cook logs`);
    console.log(`   ✅ ${totalGrocery} Grocery logs`);
    console.log(`   ✅ ${totalPayment} Payment logs`);
    console.log(`   ✅ ${totalCook + totalGrocery + totalPayment} Total logs`);
    console.log('\n🎉 Sample data inserted successfully!');
    console.log('   You can now view the data in your dashboard at http://localhost:3000');

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
insertSampleData().catch(console.error);

