import { NextRequest, NextResponse } from 'next/server';
import { getLogsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { RecordType, BoughtBy } from '@/types';

// GET single log by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getLogsCollection();
    const log = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!log) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      log: {
        ...log,
        _id: log._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log' },
      { status: 500 }
    );
  }
}

// PUT update log by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const collection = await getLogsCollection();
    
    // Validate the log exists
    const existingLog = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingLog) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      recordType: body.recordType,
      date: body.date,
      notes: body.notes || undefined,
      updatedAt: new Date().toISOString(),
    };
    
    // Add type-specific fields
    if (body.recordType === RecordType.COOK) {
      updateData.menu = body.menu;
      updateData.baseFee = body.baseFee;
      
      // Recalculate daysFoodLasted if needed
      if (body.date !== existingLog.date) {
        // Get previous cook log
        const previousCookLogs = await collection
          .find({
            recordType: RecordType.COOK,
            date: { $lt: body.date },
          })
          .sort({ date: -1 })
          .limit(1)
          .toArray();
        
        if (previousCookLogs.length > 0) {
          const prevDate = new Date(previousCookLogs[0].date);
          const currentDate = new Date(body.date);
          const diffTime = currentDate.getTime() - prevDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updateData.daysFoodLasted = diffDays > 0 ? diffDays : undefined;
        }
      }
    } else if (body.recordType === RecordType.GROCERY) {
      updateData.category = body.category;
      updateData.amount = body.amount;
      updateData.boughtBy = body.boughtBy;
      updateData.reimbursable = body.boughtBy === BoughtBy.STAFF;
      updateData.linkedCookId = body.linkedCookId || undefined;
    } else if (body.recordType === RecordType.PAYMENT) {
      updateData.amountPaid = body.amountPaid;
      updateData.method = body.method || undefined;
      updateData.remarks = body.remarks || undefined;
      updateData.isTip = body.isTip || false;
    }
    
    // Update the log
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }
    
    // Fetch and return updated log
    const updatedLog = await collection.findOne({ _id: new ObjectId(id) });
    
    return NextResponse.json({
      message: 'Log updated successfully',
      log: {
        ...updatedLog,
        _id: updatedLog!._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating log:', error);
    return NextResponse.json(
      { error: 'Failed to update log' },
      { status: 500 }
    );
  }
}

// DELETE log by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getLogsCollection();
    
    // Check if log exists
    const existingLog = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingLog) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }
    
    // Delete the log
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Log deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json(
      { error: 'Failed to delete log' },
      { status: 500 }
    );
  }
}

