package com.example.candidate;
import org.apache.tomcat.util.http.ResponseUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;



@Component
public class AuthorizationFilter implements GatewayFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Récupérer les informations d'authentification de la requête (par exemple, le token)
        // Effectuer la logique d'authentification et d'autorisation
        // Si l'autorisation est valide, continuer la chaîne de filtres
        // Sinon, renvoyer une réponse d'erreur ou rediriger la requête

        // Exemple : Vérifier si le token est présent dans les en-têtes de la requête
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        System.out.println("Token reçu : " + token);

        // Exemple de logique d'autorisation (vérification de la présence du token)
        if (token != null && token.startsWith("Bearer ")) {
            // Si le token est présent, continuer la chaîne de filtres
            return chain.filter(exchange);
        } else {
            // Si le token est absent ou invalide, renvoyer une réponse d'erreur
            // exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            // return exchange.getResponse().setComplete();
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
            String responseBody = "{\"message\": \"Vous n'avez pas les autorisations nécessaires.\"}";
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(responseBody.getBytes())));

    }
    }
}
