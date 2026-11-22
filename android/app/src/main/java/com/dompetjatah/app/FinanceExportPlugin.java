package com.dompetjatah.app;

import android.content.ClipData;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "FinanceExport")
public class FinanceExportPlugin extends Plugin {
    private static final int PAGE_WIDTH = 595;
    private static final int PAGE_HEIGHT = 842;
    private static final int LEFT = 36;
    private static final int BOTTOM = 800;
    private static final int[] COLUMN_X = { 36, 110, 211, 302, 457 };
    private static final int[] COLUMN_WIDTH = { 68, 96, 86, 148, 100 };
    private int pageNumber;
    private PdfDocument.Page activePage;

    @PluginMethod
    public void exportPdf(PluginCall call) {
        PdfDocument document = new PdfDocument();
        try {
            JSObject report = call.getObject("report");
            if (report == null) throw new IllegalArgumentException("Data laporan tidak tersedia.");
            pageNumber = 0;
            PageCursor cursor = newPage(document);
            Paint titlePaint = paint(17, true);
            cursor.canvas.drawText("Laporan keuangan", LEFT, cursor.y, titlePaint);
            cursor.y += 22;
            cursor.canvas.drawText(report.getString("from", "") + " - " + report.getString("to", ""), LEFT, cursor.y, paint(9, false));
            cursor.y += 28;

            JSONArray rows = report.getJSONArray("rows");
            List<JSONObject> income = new ArrayList<>();
            List<JSONObject> expenses = new ArrayList<>();
            for (int index = 0; index < rows.length(); index++) {
                JSONObject row = rows.getJSONObject(index);
                (row.optString("type").equals("Pemasukan") ? income : expenses).add(row);
            }
            cursor = drawTable(document, cursor, "Pemasukan", income);
            cursor = drawTable(document, cursor, "Pengeluaran", expenses);
            if (cursor.y + 75 > BOTTOM) cursor = newPage(document);
            Paint totalPaint = paint(10, true);
            cursor.canvas.drawText("Total pemasukan: " + report.getString("totalIncome", "Rp0"), LEFT, cursor.y, totalPaint);
            cursor.y += 18;
            cursor.canvas.drawText("Total pengeluaran: " + report.getString("totalExpense", "Rp0"), LEFT, cursor.y, totalPaint);
            cursor.y += 18;
            cursor.canvas.drawText("Selisih: " + report.getString("difference", "Rp0"), LEFT, cursor.y, totalPaint);
            document.finishPage(cursor.page);
            activePage = null;

            File sharedDirectory = new File(getContext().getCacheDir(), "shared");
            if (!sharedDirectory.exists() && !sharedDirectory.mkdirs()) throw new IllegalStateException("Folder berbagi tidak dapat dibuat.");
            File output = new File(sharedDirectory, "laporan-keuangan-" + System.currentTimeMillis() + ".pdf");
            try (FileOutputStream stream = new FileOutputStream(output)) {
                document.writeTo(stream);
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", output);
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("application/pdf");
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.putExtra(Intent.EXTRA_SUBJECT, "Laporan keuangan Dompet Jatah");
            share.setClipData(ClipData.newUri(getContext().getContentResolver(), "Laporan keuangan", uri));
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(share, "Simpan atau bagikan laporan"));
            call.resolve();
        } catch (Exception exception) {
            call.reject("Laporan PDF tidak dapat dibuat atau dibagikan.", exception);
        } finally {
            if (activePage != null) {
                document.finishPage(activePage);
                activePage = null;
            }
            document.close();
        }
    }

    private PageCursor drawTable(PdfDocument document, PageCursor cursor, String title, List<JSONObject> rows) {
        if (cursor.y + 55 > BOTTOM) cursor = newPage(document);
        cursor.canvas.drawText(title, LEFT, cursor.y, paint(12, true));
        cursor.y += 18;
        cursor = drawHeader(document, cursor);
        for (JSONObject row : rows) {
            String[] values = {
                row.optString("date", ""),
                row.optString("category", ""),
                row.optString("wallet", ""),
                row.optString("note", ""),
                row.optString("amount", ""),
            };
            List<List<String>> columns = new ArrayList<>();
            int lineCount = 1;
            for (int index = 0; index < values.length; index++) {
                List<String> lines = wrap(values[index], COLUMN_WIDTH[index]);
                columns.add(lines);
                lineCount = Math.max(lineCount, lines.size());
            }
            int rowHeight = Math.max(18, lineCount * 11 + 6);
            if (cursor.y + rowHeight > BOTTOM) {
                cursor = newPage(document);
                cursor = drawHeader(document, cursor);
            }
            for (int line = 0; line < lineCount; line++) {
                for (int column = 0; column < columns.size(); column++) {
                    if (line < columns.get(column).size()) {
                        cursor.canvas.drawText(columns.get(column).get(line), COLUMN_X[column], cursor.y + line * 11, paint(8, false));
                    }
                }
            }
            cursor.y += rowHeight;
        }
        cursor.y += 12;
        return cursor;
    }

    private PageCursor drawHeader(PdfDocument document, PageCursor cursor) {
        if (cursor.y + 25 > BOTTOM) cursor = newPage(document);
        String[] headers = { "Tanggal", "Kategori", "Dompet", "Keterangan", "Nominal" };
        Paint headerPaint = paint(8, true);
        for (int index = 0; index < headers.length; index++) {
            cursor.canvas.drawText(headers[index], COLUMN_X[index], cursor.y, headerPaint);
        }
        cursor.y += 17;
        cursor.canvas.drawLine(LEFT, cursor.y - 12, PAGE_WIDTH - LEFT, cursor.y - 12, paint(0.7f, false));
        return cursor;
    }

    private PageCursor newPage(PdfDocument document) {
        if (activePage != null) document.finishPage(activePage);
        pageNumber++;
        activePage = document.startPage(new PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create());
        PdfDocument.Page page = activePage;
        return new PageCursor(page, page.getCanvas(), 42);
    }

    private Paint paint(float size, boolean bold) {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(0xFF202B25);
        paint.setTextSize(size);
        paint.setTypeface(bold ? Typeface.create(Typeface.DEFAULT, Typeface.BOLD) : Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        return paint;
    }

    private List<String> wrap(String value, int width) {
        Paint paint = paint(8, false);
        List<String> lines = new ArrayList<>();
        String text = value == null ? "" : value.replace('\n', ' ').trim();
        if (text.isEmpty()) return lines;
        StringBuilder line = new StringBuilder();
        for (String word : text.split("\\s+")) {
            String candidate = line.length() == 0 ? word : line + " " + word;
            if (paint.measureText(candidate) <= width || line.length() == 0) {
                line.setLength(0);
                line.append(candidate);
            } else {
                lines.add(line.toString());
                line.setLength(0);
                line.append(word);
            }
        }
        if (line.length() > 0) lines.add(line.toString());
        return lines;
    }

    private static class PageCursor {
        final PdfDocument.Page page;
        final Canvas canvas;
        int y;

        PageCursor(PdfDocument.Page page, Canvas canvas, int y) {
            this.page = page;
            this.canvas = canvas;
            this.y = y;
        }
    }
}
