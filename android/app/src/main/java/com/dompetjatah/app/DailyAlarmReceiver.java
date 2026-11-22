package com.dompetjatah.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class DailyAlarmReceiver extends BroadcastReceiver {
    static final String PREFERENCES = "dompet-jatah-notifications";
    private static final String CHANNEL_ID = "jatah-harian";
    private static final int[] HOURS = { 10, 15, 19, 23 };

    @Override
    public void onReceive(Context context, Intent intent) {
        ensureChannel(context);
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        long allowance = preferences.getLong("allowance", 0);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        long spent = today.equals(preferences.getString("dateKey", "")) ? preferences.getLong("spentToday", 0) : 0;
        long difference = allowance - spent;
        String message = difference >= 0
            ? "Aman, sisa jatah hari ini " + rupiah(difference) + "."
            : "Melebihi jatah " + rupiah(-difference) + " hari ini.";
        int id = intent.getIntExtra("notificationId", 10);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = launchIntent == null ? null : PendingIntent.getActivity(
            context, id, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        builder.setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Pengingat jatah harian")
            .setContentText(message)
            .setStyle(new Notification.BigTextStyle().bigText(message))
            .setAutoCancel(true);
        if (contentIntent != null) builder.setContentIntent(contentIntent);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null && (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)) {
            manager.notify(id, builder.build());
        }
        scheduleNext(context);
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Pengingat jatah harian", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Status jatah harian dompet");
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    static void scheduleNext(Context context) {
        if (!context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean("enabled", false)) return;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        Calendar now = Calendar.getInstance();
        for (int hour : HOURS) {
            Calendar next = Calendar.getInstance();
            next.set(Calendar.HOUR_OF_DAY, hour);
            next.set(Calendar.MINUTE, 0);
            next.set(Calendar.SECOND, 0);
            next.set(Calendar.MILLISECOND, 0);
            if (next.getTimeInMillis() <= now.getTimeInMillis()) next.add(Calendar.DAY_OF_YEAR, 1);

            Intent alarmIntent = new Intent(context, DailyAlarmReceiver.class);
            alarmIntent.setAction(context.getPackageName() + ".DAILY_NOTIFICATION_" + hour);
            alarmIntent.putExtra("notificationId", hour);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, hour, alarmIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
            } else {
                try {
                    manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
                } catch (SecurityException exception) {
                    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
                }
            }
        }
    }

    static void cancel(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        for (int hour : HOURS) {
            Intent alarmIntent = new Intent(context, DailyAlarmReceiver.class);
            alarmIntent.setAction(context.getPackageName() + ".DAILY_NOTIFICATION_" + hour);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, hour, alarmIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            manager.cancel(pendingIntent);
        }
    }

    private String rupiah(long amount) {
        return "Rp " + NumberFormat.getNumberInstance(new Locale("id", "ID")).format(amount);
    }
}
