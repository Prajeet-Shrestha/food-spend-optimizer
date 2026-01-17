# Data Population Scripts

These scripts insert data into your MongoDB database. There are two scripts available:

1. **insert-sample-data.ts** - Generates random sample data for testing
2. **insert-real-data.ts** - Inserts real production data

## Prerequisites

1. Make sure you have a `.env.local` file in the project root with your MongoDB connection string:
   ```
   MONGODB_URI=your_mongodb_connection_string_here
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

## Usage

### Sample Data (Random Generated)

Run the sample data script using npm:

```bash
npm run seed
```

Or directly with tsx:

```bash
npx tsx scripts/insert-sample-data.ts
```

### Real Data (Production Data)

Run the real data script using npm:

```bash
npm run seed:real
```

Or directly with tsx:

```bash
npx tsx scripts/insert-real-data.ts
```

**Note:** The real data script will:
- Clear all existing logs and settings
- Insert the provided real settings (baseFee: 625, baseline costs, trackingStartDate: 2025-11-01)
- Insert 17 real log entries (8 cook logs, 2 grocery logs, 7 payment logs)
- Automatically calculate `daysFoodLasted` for cook logs
- Create all necessary indexes

## What the Scripts Do

### Sample Data Script

1. **Clear existing logs** from the database
2. **Generate sample data** for the last 30 days:
   - **Cook Logs**: Every 3-4 days with various menu items
   - **Grocery Logs**: Randomly distributed (2-3 per week) with different categories
   - **Payment Logs**: Every 10-15 days with different payment methods
3. **Create indexes** on the collection for optimal query performance
4. **Display a summary** of inserted data

### Real Data Script

1. **Clear existing logs and settings** from the database
2. **Insert real settings**:
   - baseFee: 625
   - baselineDailyLow: 360
   - baselineDailyHigh: 400
   - baselineDailyAvg: 380
   - trackingStartDate: 2025-11-01
3. **Insert real log entries**:
   - 8 Cook logs (Nov 1, 5, 9, 24, 27, 30; Dec 3, 6, 10, 14)
   - 2 Grocery logs (Nov 5, 27)
   - 7 Payment logs (Dec 1, 3, 6, 14)
4. **Calculate daysFoodLasted** automatically for cook logs
5. **Create indexes** on the collection
6. **Display a summary** with cook session details

## Sample Data Details

- **Cook Logs**: ~8-10 entries with menus like "Dal, Rice, Vegetables", "Chicken Curry", etc.
- **Grocery Logs**: ~15-20 entries with categories like Meat, Veggies, Saag, Spices, etc.
- **Payment Logs**: ~2-3 entries with amounts ranging from Rs 2000-3500
- **Base Fee**: Rs 500 per cooking session (configurable in the script)

## Customization

You can modify the script to:
- Change the number of days (`DAYS_BACK` constant)
- Adjust the base fee (`BASE_FEE` constant)
- Modify menu items, grocery categories, or payment methods
- Change the frequency of different log types

## Notes

- The script automatically calculates `daysFoodLasted` for cook logs
- Grocery logs have a mix of STAFF and ME purchases
- All dates are in the past (within the last 30 days)
- Timestamps are randomized within business hours (10 AM - 6 PM)

