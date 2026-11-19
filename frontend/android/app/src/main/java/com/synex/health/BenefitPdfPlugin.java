package com.synex.health;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "BenefitPdf")
public class BenefitPdfPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename", "");
        if (data == null || data.length() > 6000000 || !filename.matches("[가-힣A-Za-z0-9_-]{1,80}\\.pdf")) {
            call.reject("저장할 PDF 파일을 확인해 주세요.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveDocument");
    }

    @ActivityCallback
    private void saveDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject answer = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK) {
            answer.put("saved", false);
            call.resolve(answer);
            return;
        }
        Uri target = result.getData() == null ? null : result.getData().getData();
        if (target == null) { call.reject("저장 위치를 열 수 없습니다."); return; }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(target, "wt")) {
            if (out == null) throw new IOException("파일을 열 수 없습니다.");
            out.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
        } catch (IOException | RuntimeException error) {
            call.reject("PDF를 저장하지 못했습니다. 저장 위치를 다시 선택해 주세요.", error);
            return;
        }
        answer.put("saved", true);
        call.resolve(answer);
    }
}
