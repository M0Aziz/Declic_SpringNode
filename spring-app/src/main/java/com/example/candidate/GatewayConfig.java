package com.example.candidate;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder, AuthorizationFilter authorizationFilter) {
        return builder.routes()
                .route("react-to-spring-route", r -> r.path("/api/**")
                        .filters(f -> f.filter(authorizationFilter)
                                .rewritePath("/api/(?<remaining>.*)", "/${remaining}"))
                        .uri("http://localhost:5000")) 
                .build();
    }
}
