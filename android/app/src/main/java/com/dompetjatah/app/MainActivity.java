package com.dompetjatah.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DailyNotificationsPlugin.class);
        registerPlugin(FinanceExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
