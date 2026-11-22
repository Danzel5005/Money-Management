package com.dompetjatah.app;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
    name = "DailyNotifications",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
)
public class DailyNotificationsPlugin extends Plugin {
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && !hasPermission("notifications")) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        openExactAlarmSettings();
        call.resolve(permissionResult());
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        openExactAlarmSettings();
        call.resolve(permissionResult());
    }

    @PluginMethod
    public void updateSnapshot(PluginCall call) {
        double allowance = call.getDouble("allowance", 0.0);
        double spentToday = call.getDouble("spentToday", 0.0);
        String dateKey = call.getString("dateKey", "");
        boolean enabled = call.getBoolean("enabled", true);
        getContext().getSharedPreferences(DailyAlarmReceiver.PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putLong("allowance", Math.max(0, Math.round(allowance)))
            .putLong("spentToday", Math.max(0, Math.round(spentToday)))
            .putString("dateKey", dateKey)
            .putBoolean("enabled", enabled)
            .apply();
        DailyAlarmReceiver.ensureChannel(getContext());
        if (enabled) DailyAlarmReceiver.scheduleNext(getContext());
        else DailyAlarmReceiver.cancel(getContext());
        call.resolve();
    }

    private JSObject permissionResult() {
        JSObject result = new JSObject();
        result.put("notificationsAllowed", Build.VERSION.SDK_INT < 33 || hasPermission("notifications"));
        result.put("exactAlarmAllowed", canScheduleExactAlarms());
        return result;
    }

    private boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    private void openExactAlarmSettings() {
        if (Build.VERSION.SDK_INT < 31 || canScheduleExactAlarms()) return;
        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
