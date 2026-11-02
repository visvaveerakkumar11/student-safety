package com.childsafety.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.BusDtos.AssignStudentsRequest;
import com.childsafety.dto.BusDtos.BusDetailDto;
import com.childsafety.dto.BusDtos.BusDto;
import com.childsafety.dto.BusDtos.BusRequest;
import com.childsafety.service.BusService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/buses")
public class BusController {

    private final BusService buses;

    public BusController(BusService buses) {
        this.buses = buses;
    }

    @GetMapping
    public List<BusDto> list() {
        return buses.list();
    }

    @GetMapping("/{id}")
    public BusDetailDto get(@PathVariable Long id) {
        return buses.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BusDto create(@Valid @RequestBody BusRequest request) {
        return buses.create(request);
    }

    @PutMapping("/{id}")
    public BusDto update(@PathVariable Long id, @Valid @RequestBody BusRequest request) {
        return buses.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        buses.delete(id);
    }

    @PostMapping("/{id}/students")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assignStudents(@PathVariable Long id, @Valid @RequestBody AssignStudentsRequest request) {
        buses.assignStudents(id, request.studentIds());
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignStudent(@PathVariable Long id, @PathVariable Long studentId) {
        buses.unassignStudent(id, studentId);
    }
}
