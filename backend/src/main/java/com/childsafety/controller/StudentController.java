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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.PageResponse;
import com.childsafety.dto.StudentDtos.StudentDetailDto;
import com.childsafety.dto.StudentDtos.StudentDto;
import com.childsafety.dto.StudentDtos.StudentRequest;
import com.childsafety.entity.TransportStatus;
import com.childsafety.service.StudentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService students;

    public StudentController(StudentService students) {
        this.students = students;
    }

    /** {@code busId=0} lists students without a bus. */
    @GetMapping
    public PageResponse<StudentDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) TransportStatus status,
            @RequestParam(defaultValue = "fullName") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return students.list(q, className, busId, status, sort, direction, Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    @GetMapping("/classes")
    public List<String> classes() {
        return students.classNames();
    }

    @GetMapping("/{id}")
    public StudentDetailDto get(@PathVariable Long id) {
        return students.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentDto create(@Valid @RequestBody StudentRequest request) {
        return students.create(request);
    }

    @PutMapping("/{id}")
    public StudentDto update(@PathVariable Long id, @Valid @RequestBody StudentRequest request) {
        return students.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        students.delete(id);
    }
}
