package com.childsafety.dto;

/** Hides contact numbers in list views: "+91 98400 11201" -> "+91 ******1201". */
public final class PhoneMask {

    private PhoneMask() {}

    public static String mask(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return "****";
        }
        String countryCode = phone.startsWith("+") && phone.contains(" ")
                ? phone.substring(0, phone.indexOf(' ')) + " "
                : "";
        return countryCode + "******" + digits.substring(digits.length() - 4);
    }
}
