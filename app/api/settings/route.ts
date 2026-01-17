import { NextRequest, NextResponse } from 'next/server';
import { getSettingsFromDb, saveSettingsToDb } from '@/lib/db';
import { Settings } from '@/lib/config';

// GET /api/settings
export async function GET() {
  try {
    const settings = await getSettingsFromDb();
    
    if (!settings) {
      // Return defaults if no settings in DB
      return NextResponse.json({
        settings: {
          baseFee: 0,
          baselineDailyLow: 360,
          baselineDailyHigh: 400,
          baselineDailyAvg: 380,
          trackingStartDate: undefined,
        },
      });
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate settings
    const settings: Settings = {
      baseFee: Number(body.baseFee) ?? 0,
      baselineDailyLow: Number(body.baselineDailyLow) ?? 360,
      baselineDailyHigh: Number(body.baselineDailyHigh) ?? 400,
      baselineDailyAvg: Number(body.baselineDailyAvg) ?? 380,
      trackingStartDate: body.trackingStartDate || undefined,
    };
    
    // Validate values
    if (settings.baseFee < 0) {
      return NextResponse.json(
        { error: 'Base fee must be non-negative' },
        { status: 400 }
      );
    }
    
    if (settings.baselineDailyLow < 0 || settings.baselineDailyHigh < 0 || settings.baselineDailyAvg < 0) {
      return NextResponse.json(
        { error: 'Baseline values must be non-negative' },
        { status: 400 }
      );
    }
    
    if (settings.baselineDailyLow > settings.baselineDailyHigh) {
      return NextResponse.json(
        { error: 'Baseline low must be less than or equal to baseline high' },
        { status: 400 }
      );
    }
    
    if (settings.trackingStartDate) {
      const date = new Date(settings.trackingStartDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid tracking start date format' },
          { status: 400 }
        );
      }
    }
    
    await saveSettingsToDb(settings);
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

