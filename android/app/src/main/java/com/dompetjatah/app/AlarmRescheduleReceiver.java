package com.dompetjatah.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class AlarmRescheduleReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        DailyAlarmReceiver.ensureChannel(context);
        DailyAlarmReceiver.scheduleNext(context);
    }
}
