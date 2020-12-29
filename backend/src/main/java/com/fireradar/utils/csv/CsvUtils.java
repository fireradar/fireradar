package com.fireradar.utils.csv;

import java.util.HashSet;
import java.util.Map;

public class CsvUtils {

    private CsvUtils() {
    }

    public static void trimHeaders(Map<String, String> csvRow) {
        for (Map.Entry<String, String> entry : new HashSet<>(csvRow.entrySet())) {
            String trimmed = entry.getKey().trim();
            if (!trimmed.equals(entry.getKey())) {
                csvRow.remove(entry.getKey());
                csvRow.put(trimmed, entry.getValue());
            }
        }
    }

    public static boolean isRowEmpty(Map<String, String> csvRow) {
        boolean result = true;
        for (String key : csvRow.keySet()) {
            if (csvRow.get(key) != null
                    && !csvRow.get(key).trim().isEmpty()) {
                result = false;
            }
        }
        return result;
    }
}
