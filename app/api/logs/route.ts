import { NextRequest, NextResponse } from 'next/server';
import { getLogsCollection, ensureIndexes, getAllLogs } from '@/lib/db';
import { RecordType, LogEntry, BoughtBy, CookLog, GroceryLog, PaymentLog } from '@/types';
import { getSettings } from '@/lib/config';
import { calculateDaysFoodLasted, getPreviousCookLog } from '@/lib/calculations';

// GET /api/logs
export async function GET(request: NextRequest) {
  try {
    await ensureIndexes();
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as RecordType | null;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    
    const logs = await getAllLogs({
      type: type || undefined,
      from,
      to,
    });
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

// POST /api/logs
export async function POST(request: NextRequest) {
  try {
    await ensureIndexes();
    
    const body = await request.json();
    const settings = await getSettings();
    
    // Validate record type
    if (!body.recordType || !Object.values(RecordType).includes(body.recordType)) {
      return NextResponse.json(
        { error: 'Invalid record type' },
        { status: 400 }
      );
    }
    
    // Validate date
    if (!body.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }
    
    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    // Date cannot be in the future
    if (date > new Date()) {
      return NextResponse.json(
        { error: 'Date cannot be in the future' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    const dateString = date.toISOString().split('T')[0];
    
    let logEntry: LogEntry;
    
    if (body.recordType === RecordType.COOK) {
      // Validate cook log fields
      if (!body.menu || typeof body.menu !== 'string') {
        return NextResponse.json(
          { error: 'Menu is required for cook log' },
          { status: 400 }
        );
      }
      
      const baseFee = body.baseFee !== undefined 
        ? Number(body.baseFee) 
        : settings.baseFee;
      
      if (baseFee < 0) {
        return NextResponse.json(
          { error: 'Base fee must be positive' },
          { status: 400 }
        );
      }
      
      // Get all existing logs to calculate days food lasted
      const existingLogs = await getAllLogs();
      const previousCookLog = getPreviousCookLog(existingLogs, dateString);
      const daysFoodLasted = previousCookLog
        ? calculateDaysFoodLasted(dateString, previousCookLog.date)
        : undefined;
      
      const cookLog: CookLog = {
        recordType: RecordType.COOK,
        date: dateString,
        menu: body.menu,
        baseFee,
        daysFoodLasted,
        notes: body.notes,
        createdAt: now,
        updatedAt: now,
      };
      
      logEntry = cookLog;
      
    } else if (body.recordType === RecordType.GROCERY) {
      // Validate grocery log fields
      if (!body.amount || Number(body.amount) <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      
      if (!body.boughtBy || !Object.values(BoughtBy).includes(body.boughtBy)) {
        return NextResponse.json(
          { error: 'boughtBy must be STAFF or ME' },
          { status: 400 }
        );
      }
      
      const groceryLog: GroceryLog = {
        recordType: RecordType.GROCERY,
        date: dateString,
        category: body.category || '',
        amount: Number(body.amount),
        boughtBy: body.boughtBy,
        reimbursable: body.boughtBy === BoughtBy.STAFF,
        linkedCookId: body.linkedCookId,
        notes: body.notes,
        createdAt: now,
        updatedAt: now,
      };
      
      logEntry = groceryLog;
      
    } else if (body.recordType === RecordType.PAYMENT) {
      // Validate payment log fields
      if (!body.amountPaid || Number(body.amountPaid) <= 0) {
        return NextResponse.json(
          { error: 'amountPaid must be a positive number' },
          { status: 400 }
        );
      }
      
      const paymentLog: PaymentLog = {
        recordType: RecordType.PAYMENT,
        date: dateString,
        amountPaid: Number(body.amountPaid),
        method: body.method,
        remarks: body.remarks,
        notes: body.notes,
        createdAt: now,
        updatedAt: now,
      };
      
      logEntry = paymentLog;
      
    } else {
      return NextResponse.json(
        { error: 'Invalid record type' },
        { status: 400 }
      );
    }
    
    // Insert into database
    const collection = await getLogsCollection();
    const result = await collection.insertOne(logEntry as any);
    
    const insertedLog = {
      ...logEntry,
      _id: result.insertedId.toString(),
    };
    
    return NextResponse.json({ log: insertedLog }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating log:', error);
    return NextResponse.json(
      { error: 'Failed to create log' },
      { status: 500 }
    );
  }
}

