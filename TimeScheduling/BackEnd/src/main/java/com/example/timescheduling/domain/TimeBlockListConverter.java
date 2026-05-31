package com.example.timescheduling.domain;

import com.example.timescheduling.dto.TimeBlock;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;

@Converter
public class TimeBlockListConverter implements AttributeConverter<List<TimeBlock>, String> {

    private static final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Override
    public String convertToDatabaseColumn(List<TimeBlock> attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return mapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize time blocks to JSON", e);
        }
    }

    @Override
    public List<TimeBlock> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return mapper.readValue(dbData, new TypeReference<List<TimeBlock>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize time blocks from JSON", e);
        }
    }
}
