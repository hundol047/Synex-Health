package com.synex.health;

import android.location.Address;
import android.location.Geocoder;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "FacilityAddress")
public class FacilityAddressPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final Pattern STREET_NUMBER = Pattern.compile("([^\\s]+(?:로|길))\\s*(\\d+(?:-\\d+)?)");

    @PluginMethod
    public void find(PluginCall call) {
        String address = call.getString("address", "");
        Matcher street = STREET_NUMBER.matcher(address);
        if (!Geocoder.isPresent() || !street.find()) {
            call.reject("도로명주소 위치를 확인할 수 없습니다.");
            return;
        }
        String road = street.group(1);
        String number = street.group(2);
        Pattern building = Pattern.compile(Pattern.quote(road) + "\\s*" + Pattern.quote(number) + "(?![0-9-])");
        worker.execute(() -> {
            try {
                Geocoder geocoder = new Geocoder(getContext(), Locale.KOREA);
                List<Address> matches = geocoder.getFromLocationName(address, 3, 32.5, 124.0, 39.0, 132.0);
                if (matches != null) {
                    for (Address hit : matches) {
                        String line = hit.getAddressLine(0);
                        if (line != null && building.matcher(line).find() && hit.hasLatitude() && hit.hasLongitude()) {
                            JSObject result = new JSObject();
                            result.put("latitude", hit.getLatitude());
                            result.put("longitude", hit.getLongitude());
                            call.resolve(result);
                            return;
                        }
                    }
                }
                call.reject("건물 위치를 찾지 못했습니다.");
            } catch (IOException | RuntimeException error) {
                call.reject("주소 조회 서비스를 사용할 수 없습니다.", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdownNow();
    }
}
