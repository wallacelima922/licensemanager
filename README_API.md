# API de Verificação de Licenças

## 📋 Visão Geral

API pública para validar licenças dos seus projetos PHP.

## 🔑 Endpoint de Verificação

### POST /api/verify

Valida se uma licença é válida para um domínio e produto específicos.

**URL:** `https://project-gate.preview.emergentagent.com/api/verify`

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "license_key": "sua-chave-de-licenca-aqui",
  "domain": "seusite.com",
  "product_name": "Produto A"
}
```

**Resposta de Sucesso (200):**
```json
{
  "valid": true,
  "message": "License is valid",
  "license_data": {
    "client_name": "Nome do Cliente",
    "expiration_date": "2024-12-31T23:59:59+00:00",
    "product_id": "uuid-do-produto"
  }
}
```

**Resposta de Erro (200):**
```json
{
  "valid": false,
  "message": "Invalid license key | Domain mismatch | Product mismatch | License is inactive | License has expired",
  "license_data": null
}
```

## 💻 Exemplo de Integração PHP

### Exemplo Básico

```php
<?php
// config.php
define('LICENSE_API_URL', 'https://project-gate.preview.emergentagent.com/api/verify');
define('LICENSE_KEY', 'sua-chave-aqui'); // Pegar das configurações
define('PRODUCT_NAME', 'Produto A');

// license_checker.php
function verificarLicenca() {
    $domain = $_SERVER['HTTP_HOST'];
    
    $data = [
        'license_key' => LICENSE_KEY,
        'domain' => $domain,
        'product_name' => PRODUCT_NAME
    ];
    
    $ch = curl_init(LICENSE_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return false;
    }
    
    $result = json_decode($response, true);
    return $result['valid'] ?? false;
}

// Usar no seu sistema
if (!verificarLicenca()) {
    die('Licença inválida! Entre em contato com o suporte.');
}
```

### Exemplo com Cache

```php
<?php
function verificarLicencaComCache() {
    $cacheFile = __DIR__ . '/cache/license_check.txt';
    $cacheTime = 3600; // 1 hora
    
    // Verificar cache
    if (file_exists($cacheFile)) {
        $lastCheck = filemtime($cacheFile);
        if (time() - $lastCheck < $cacheTime) {
            $cached = file_get_contents($cacheFile);
            return $cached === '1';
        }
    }
    
    // Fazer verificação
    $isValid = verificarLicenca();
    
    // Salvar cache
    if (!is_dir(dirname($cacheFile))) {
        mkdir(dirname($cacheFile), 0755, true);
    }
    file_put_contents($cacheFile, $isValid ? '1' : '0');
    
    return $isValid;
}
```

### Exemplo com Middleware

```php
<?php
// middleware/LicenseMiddleware.php
class LicenseMiddleware {
    public static function check() {
        session_start();
        
        // Verificar a cada 24h
        if (isset($_SESSION['license_checked']) && 
            time() - $_SESSION['license_checked'] < 86400) {
            return true;
        }
        
        $domain = $_SERVER['HTTP_HOST'];
        $licenseKey = include(__DIR__ . '/../config/license.php');
        
        $ch = curl_init('https://project-gate.preview.emergentagent.com/api/verify');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'license_key' => $licenseKey,
            'domain' => $domain,
            'product_name' => 'Produto A'
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if (!$result || !$result['valid']) {
            header('HTTP/1.1 403 Forbidden');
            die('Licença inválida ou expirada. Contate o administrador.');
        }
        
        $_SESSION['license_checked'] = time();
        return true;
    }
}

// index.php
require_once 'middleware/LicenseMiddleware.php';
LicenseMiddleware::check();
```

## 🔒 Validações Realizadas

1. **Chave de Licença:** Verifica se a chave existe no sistema
2. **Domínio:** Validação exata do domínio (seusite.com ≠ www.seusite.com)
3. **Produto:** Verifica se a licença pertence ao produto correto
4. **Status:** Apenas licenças com status "active" são válidas
5. **Expiração:** Verifica se a licença não expirou

## 📝 Credenciais de Teste

**Admin:**
- Email: admin@example.com
- Senha: admin123

## 🎯 Fluxo de Uso

1. Admin cria produtos no painel
2. Admin cria licenças vinculadas a usuários e produtos
3. Usuário vê suas licenças no painel e copia a chave
4. Usuário configura a chave no projeto PHP
5. Sistema PHP valida a licença via API antes de executar

## 🚀 Deploy

Para conectar ao seu MariaDB em produção, edite `/app/backend/.env`:

```env
MONGO_URL="mysql://usuario:senha@host:porta/database"
DB_NAME="seu_database"
```

Ajuste o código para usar SQLAlchemy com MySQL/MariaDB.
