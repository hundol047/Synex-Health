package com.synex.health;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.UUID;

/** Explicit, local-only video export. No camera, microphone, or storage permissions. */
@CapacitorPlugin(name = "VideoRecording")
public class VideoRecordingPlugin extends Plugin {
    private static final long MAX_BYTES = 24L * 1024 * 1024;
    private static final int MAX_CHUNK_BYTES = 256 * 1024;
    private Export active;

    private static class Export {
        String id, name, mime;
        boolean share;
        long bytes;
        OutputStream output;
        Uri uri;
        File file;
    }

    private void remove(Export item) {
        if (item == null) return;
        try { if (item.output != null) item.output.close(); } catch (Exception ignored) {}
        item.output = null;
        if (item.file != null) item.file.delete();
        else if (item.uri != null) {
            try { getContext().getContentResolver().delete(item.uri, null, null); } catch (Exception ignored) {}
        }
    }

    private Export transaction(PluginCall call) {
        String id = call.getString("id");
        if (active == null || id == null || !id.equals(active.id)) {
            call.reject("촬영 파일 저장 세션이 종료되었습니다. 다시 저장해 주세요.");
            return null;
        }
        return active;
    }

    @PluginMethod
    public void begin(PluginCall call) {
        String name = call.getString("name", "");
        String mime = call.getString("mimeType", "");
        if (!name.matches("Synex-[A-Za-z0-9_-]+\\.(mp4|webm)") || name.length() > 160 ||
                !(mime.equals("video/mp4") && name.endsWith(".mp4") || mime.equals("video/webm") && name.endsWith(".webm"))) {
            call.reject("허용되지 않은 촬영 파일 형식입니다."); return;
        }
        remove(active); active = null;
        Export item = new Export();
        item.id = UUID.randomUUID().toString(); item.name = name; item.mime = mime;
        item.share = call.getBoolean("share", false) || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q;
        try {
            if (!item.share && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Synex Health");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                item.uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (item.uri == null) throw new Exception("다운로드 폴더를 열 수 없습니다.");
                item.output = resolver.openOutputStream(item.uri, "w");
            } else {
                File directory = new File(getContext().getCacheDir(), "synex-coach-video");
                if (!directory.isDirectory() && !directory.mkdirs()) throw new Exception("저장 공간을 열 수 없습니다.");
                File[] old = directory.listFiles();
                if (old != null) for (File file : old) {
                    if (System.currentTimeMillis() - file.lastModified() > 24L * 60 * 60 * 1000) file.delete();
                }
                item.file = new File(directory, name);
                item.output = new FileOutputStream(item.file, false);
            }
            if (item.output == null) throw new Exception("촬영 파일을 열 수 없습니다.");
            active = item;
            JSObject result = new JSObject(); result.put("id", item.id); call.resolve(result);
        } catch (Exception error) {
            remove(item); call.reject("동영상 저장을 시작하지 못했습니다. 저장 공간을 확인해 주세요.", error);
        }
    }

    @PluginMethod
    public void append(PluginCall call) {
        Export item = transaction(call); if (item == null) return;
        String data = call.getString("data", "");
        try {
            if (data.isEmpty() || data.length() > 350000) throw new Exception("촬영 조각의 크기가 올바르지 않습니다.");
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (bytes.length == 0 || bytes.length > MAX_CHUNK_BYTES || item.bytes + bytes.length > MAX_BYTES) throw new Exception("촬영 파일 크기 제한을 넘었습니다.");
            item.output.write(bytes); item.bytes += bytes.length; call.resolve();
        } catch (Exception error) {
            active = null; remove(item); call.reject("동영상을 저장하지 못했습니다. 공간을 확인하고 다시 시도해 주세요.", error);
        }
    }

    @PluginMethod
    public void finish(PluginCall call) {
        Export item = transaction(call); if (item == null) return;
        try {
            if (item.bytes < 128) throw new Exception("촬영된 영상이 없습니다.");
            item.output.close(); item.output = null; active = null;
            if (!item.share) {
                ContentValues values = new ContentValues(); values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (getContext().getContentResolver().update(item.uri, values, null, null) != 1) throw new Exception("저장을 완료하지 못했습니다.");
                JSObject result = new JSObject(); result.put("saved", true); result.put("path", "다운로드/Synex Health/" + item.name); call.resolve(result);
            } else {
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", item.file);
                Intent send = new Intent(Intent.ACTION_SEND); send.setType(item.mime); send.putExtra(Intent.EXTRA_STREAM, uri);
                send.setClipData(ClipData.newUri(getContext().getContentResolver(), item.name, uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(send, "운동 동영상 저장 · 공유"); chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getBridge().executeOnMainThread(() -> {
                    try {
                        getActivity().startActivity(chooser);
                        JSObject result = new JSObject(); result.put("shared", true); call.resolve(result);
                    } catch (Exception error) { remove(item); call.reject("공유할 앱을 열지 못했습니다. 다시 시도해 주세요.", error); }
                });
            }
        } catch (Exception error) {
            active = null; remove(item); call.reject("촬영 파일 저장을 마무리하지 못했습니다. 다시 시도해 주세요.", error);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (active != null && active.id.equals(id)) { Export item = active; active = null; remove(item); }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() { remove(active); active = null; }
}
