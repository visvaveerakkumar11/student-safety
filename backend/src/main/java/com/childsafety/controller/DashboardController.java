package com.childsafety.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.InsightDtos.ActivityItem;
import com.childsafety.dto.InsightDtos.DashboardSummary;
import com.childsafety.service.DashboardService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/summary")
    public DashboardSummary summary() {
        return dashboard.summary();
    }

    @GetMapping("/activity")
    public List<ActivityItem> activity(@RequestParam(defaultValue = "15") int limit) {
        return dashboard.activity(Math.clamp(limit, 1, 50));
    }
}
