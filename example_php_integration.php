<?php
/**
 * EXEMPLO DE INTEGRAÇÃO PHP
 * Sistema de Verificação de Licenças
 * 
 * Como usar:
 * 1. Copie este arquivo para seu projeto PHP
 * 2. Configure as constantes abaixo
 * 3. Inclua no início do seu sistema: require_once 'license_checker.php';
 */

// ==================== CONFIGURAÇÃO ====================

define('LICENSE_API_URL', 'https://project-gate.preview.emergentagent.com/api/verify');
define('LICENSE_KEY', '3b6f6b20-996e-410a-83cc-ce10972f0603'); // ALTERAR para sua chave
define('PRODUCT_NAME', 'Produto A'); // ALTERAR para seu produto
define('LICENSE_CACHE_TIME', 3600); // Cache de 1 hora

// ==================== FUNÇÕES ====================

/**
 * Verifica a licença via API
 */
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($httpCode !== 200 || $error) {
        error_log("Erro ao verificar licença: HTTP $httpCode - $error");
        return false;
    }
    
    $result = json_decode($response, true);
    return $result['valid'] ?? false;
}

/**
 * Verifica licença com sistema de cache
 */
function verificarLicencaComCache() {
    $cacheFile = sys_get_temp_dir() . '/license_check_' . md5(LICENSE_KEY) . '.cache';
    
    // Verificar cache
    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        
        if (time() - $cacheData['timestamp'] < LICENSE_CACHE_TIME) {
            return $cacheData['valid'];
        }
    }
    
    // Fazer verificação
    $isValid = verificarLicenca();
    
    // Salvar cache
    file_put_contents($cacheFile, json_encode([
        'valid' => $isValid,
        'timestamp' => time()
    ]));
    
    return $isValid;
}

/**
 * Verificação com informações detalhadas
 */
function verificarLicencaDetalhada() {
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
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

/**
 * Página de erro de licença
 */
function mostrarErroLicenca($mensagem = '') {
    http_response_code(403);
    ?>
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Licença Inválida</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
            }
            .icon {
                font-size: 60px;
                margin-bottom: 20px;
            }
            h1 {
                color: #e74c3c;
                margin-bottom: 10px;
            }
            p {
                color: #666;
                line-height: 1.6;
            }
            .info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🔒</div>
            <h1>Licença Inválida</h1>
            <p>Este sistema requer uma licença válida para funcionar.</p>
            <?php if ($mensagem): ?>
                <div class="info">
                    <strong>Motivo:</strong> <?php echo htmlspecialchars($mensagem); ?>
                </div>
            <?php endif; ?>
            <div class="info">
                <strong>Domínio:</strong> <?php echo htmlspecialchars($_SERVER['HTTP_HOST']); ?><br>
                <strong>Produto:</strong> <?php echo htmlspecialchars(PRODUCT_NAME); ?>
            </div>
            <p style="margin-top: 20px; font-size: 14px;">
                Entre em contato com o fornecedor do software para obter uma licença válida.
            </p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// ==================== EXEMPLOS DE USO ====================

// EXEMPLO 1: Verificação simples (bloqueia se inválido)
if (!verificarLicencaComCache()) {
    mostrarErroLicenca('Licença não encontrada ou expirada');
}

// EXEMPLO 2: Verificação com informações detalhadas
$licenseInfo = verificarLicencaDetalhada();
if (!$licenseInfo['valid']) {
    mostrarErroLicenca($licenseInfo['message']);
}

// EXEMPLO 3: Verificação e exibição de informações
if ($licenseInfo['valid'] && isset($licenseInfo['license_data'])) {
    $expirationDate = new DateTime($licenseInfo['license_data']['expiration_date']);
    echo "<!-- Licença válida até: " . $expirationDate->format('d/m/Y') . " -->";
}

// ==================== MIDDLEWARE CLASS ====================

class LicenseMiddleware {
    private static $checked = false;
    
    public static function check() {
        if (self::$checked) {
            return true;
        }
        
        session_start();
        
        // Verificar a cada 24 horas na sessão
        if (isset($_SESSION['license_valid']) && 
            isset($_SESSION['license_checked_at']) &&
            time() - $_SESSION['license_checked_at'] < 86400) {
            
            if ($_SESSION['license_valid']) {
                self::$checked = true;
                return true;
            }
        }
        
        // Fazer verificação
        $isValid = verificarLicenca();
        
        $_SESSION['license_valid'] = $isValid;
        $_SESSION['license_checked_at'] = time();
        
        if (!$isValid) {
            mostrarErroLicenca('Licença inválida ou expirada');
        }
        
        self::$checked = true;
        return true;
    }
}

// ==================== USO NO SEU SISTEMA ====================

/*
// index.php do seu sistema:
<?php
require_once 'license_checker.php';

// Opção 1: Verificação automática
LicenseMiddleware::check();

// Opção 2: Verificação manual
if (!verificarLicencaComCache()) {
    die('Licença inválida!');
}

// Seu código continua aqui...
echo "Sistema funcionando!";
?>
*/

// ==================== TESTE ====================

echo "<!DOCTYPE html>";
echo "<html><head><title>Teste de Licença</title></head><body>";
echo "<h1>✅ Licença Válida!</h1>";
echo "<p>Domínio: " . htmlspecialchars($_SERVER['HTTP_HOST']) . "</p>";
echo "<p>Produto: " . htmlspecialchars(PRODUCT_NAME) . "</p>";

if (isset($licenseInfo['license_data'])) {
    echo "<h2>Informações da Licença:</h2>";
    echo "<ul>";
    echo "<li>Cliente: " . htmlspecialchars($licenseInfo['license_data']['client_name']) . "</li>";
    echo "<li>Expira em: " . date('d/m/Y H:i', strtotime($licenseInfo['license_data']['expiration_date'])) . "</li>";
    echo "</ul>";
}

echo "</body></html>";
?>
