package pl.alyx.api.excel.configuration;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AccessConfiguration {
    private JwtConfiguration jwt;
    private OAuth2Configuration oauth2;
    private TokensConfiguration tokens;
    private AclConfiguration acl;

    public JwtConfiguration getJwt() {
        return jwt;
    }

    public void setJwt(JwtConfiguration jwt) {
        this.jwt = jwt;
    }

    public OAuth2Configuration getOauth2() {
        return oauth2;
    }

    public void setOauth2(OAuth2Configuration oauth2) {
        this.oauth2 = oauth2;
    }

    public TokensConfiguration getTokens() {
        return tokens;
    }

    public void setTokens(TokensConfiguration tokens) {
        this.tokens = tokens;
    }

    public AclConfiguration getAcl() {
        return acl;
    }

    public void setAcl(AclConfiguration acl) {
        this.acl = acl;
    }

    public static class JwtConfiguration {
        private String secret;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }
    }

    public static class OAuth2Configuration {
        private List<Client> clients;
        private List<User> users;

        public List<Client> getClients() {
            return clients;
        }

        public void setClients(List<Client> clients) {
            this.clients = clients;
        }

        public List<User> getUsers() {
            return users;
        }

        public void setUsers(List<User> users) {
            this.users = users;
        }

        public static class Client {
            @JsonProperty("client_id")
            private String clientId;
            @JsonProperty("client_secret")
            private String clientSecret;
            @JsonProperty("grant_types")
            private List<String> grantTypes;
            private List<String> scopes;

            public String getClientId() {
                return clientId;
            }

            public void setClientId(String clientId) {
                this.clientId = clientId;
            }

            public String getClientSecret() {
                return clientSecret;
            }

            public void setClientSecret(String clientSecret) {
                this.clientSecret = clientSecret;
            }

            public List<String> getGrantTypes() {
                return grantTypes;
            }

            public void setGrantTypes(List<String> grantTypes) {
                this.grantTypes = grantTypes;
            }

            public List<String> getScopes() {
                return scopes;
            }

            public void setScopes(List<String> scopes) {
                this.scopes = scopes;
            }
        }

        public static class User {
            private String username;
            @JsonProperty("password_hash")
            private String passwordHash;
            private List<String> scopes;

            public String getUsername() {
                return username;
            }

            public void setUsername(String username) {
                this.username = username;
            }

            public String getPasswordHash() {
                return passwordHash;
            }

            public void setPasswordHash(String passwordHash) {
                this.passwordHash = passwordHash;
            }

            public List<String> getScopes() {
                return scopes;
            }

            public void setScopes(List<String> scopes) {
                this.scopes = scopes;
            }
        }
    }

    public static class TokensConfiguration {
        @JsonProperty("static")
        private List<StaticToken> staticTokens;

        public List<StaticToken> getStaticTokens() {
            return staticTokens;
        }

        public void setStaticTokens(List<StaticToken> staticTokens) {
            this.staticTokens = staticTokens;
        }

        public static class StaticToken {
            private String token;
            private String name;
            private List<String> scopes;

            public String getToken() {
                return token;
            }

            public void setToken(String token) {
                this.token = token;
            }

            public String getName() {
                return name;
            }

            public void setName(String name) {
                this.name = name;
            }

            public List<String> getScopes() {
                return scopes;
            }

            public void setScopes(List<String> scopes) {
                this.scopes = scopes;
            }
        }
    }

    public static class AclConfiguration {
        private List<Rule> rules;

        public List<Rule> getRules() {
            return rules;
        }

        public void setRules(List<Rule> rules) {
            this.rules = rules;
        }

        public static class Rule {
            private String scope;
            private List<String> allow;
            @JsonProperty("admin_endpoints")
            private Boolean adminEndpoints;

            public String getScope() {
                return scope;
            }

            public void setScope(String scope) {
                this.scope = scope;
            }

            public List<String> getAllow() {
                return allow;
            }

            public void setAllow(List<String> allow) {
                this.allow = allow;
            }

            public Boolean getAdminEndpoints() {
                return adminEndpoints;
            }

            public void setAdminEndpoints(Boolean adminEndpoints) {
                this.adminEndpoints = adminEndpoints;
            }
        }
    }
}
