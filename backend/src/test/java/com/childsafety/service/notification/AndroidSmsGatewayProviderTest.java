package com.childsafety.service.notification;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AndroidSmsGatewayProviderTest {

    @Test
    void normalisesIndianNumbersToE164() {
        assertThat(AndroidSmsGatewayProvider.toE164("+91 70107 47232")).isEqualTo("+917010747232");
        assertThat(AndroidSmsGatewayProvider.toE164("7010747232")).isEqualTo("+917010747232");
        assertThat(AndroidSmsGatewayProvider.toE164("070107-47232")).isEqualTo("+917010747232");
        assertThat(AndroidSmsGatewayProvider.toE164("917010747232")).isEqualTo("+917010747232");
    }

    @Test
    void rejectsNumbersThatAreTooShort() {
        assertThat(AndroidSmsGatewayProvider.toE164("12345")).isNull();
        assertThat(AndroidSmsGatewayProvider.toE164(null)).isNull();
    }
}
