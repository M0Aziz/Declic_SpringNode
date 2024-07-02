package com.example.candidate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.PropertySource;

@SpringBootApplication
@PropertySource("classpath:application.properties")
public class CandidateApplication {

    public static void main(String[] args) {
        SpringApplication.run(CandidateApplication.class, args);
    }

    @Autowired
    private CandidatRepository repository;

    @Bean
    ApplicationRunner init(){

        return (args)->{
            repository.save(new Candidat("Med","Aziz","meda@gmail.com"));
            repository.save(new Candidat("Hamza","Brahim","meda@gmail.com"));

            repository.save(new Candidat("Ilyes","Coach","meda@gmail.com"));
            repository.findAll().forEach(System.out::println);
        };
    }

}
