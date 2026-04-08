package com.example.account_service;

import com.example.account_service.service.AccountEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class AccountServiceApplicationTests {

    @MockitoBean
    private AccountEmailService accountEmailService;

    @Test
    void contextLoads() {
    }
}