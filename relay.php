<?php
/*
 * EMPIRE CODE HUB — relais de synchronisation Chariow (à héberger sur Hostinger, PHP 8.1+ avec cURL et DOM).
 * Le navigateur appelle ce fichier ; le serveur lit la boutique, met le résultat en cache 10 minutes,
 * et renvoie du JSON. Aucune clé secrète n'est nécessaire pour la lecture publique de la boutique.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=300');

const STORE = 'https://empirecode.mychariow.co';
const TTL = 600;
const CACHE = __DIR__ . '/catalogue-cache.json';
const RESERVED = ['about', 'help', 'contact', 'sitemap', 'legal-notice', 'terms-of-service', 'privacy-policy', 'cart', 'checkout', 'login', 'register', 'account', 'products', 'collections', 'search', 'blog', 'faq', 'order', 'orders', 'store', 'api'];

function fetch_url(string $url): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; EmpireCodeHub/2.0)', CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($body !== false && $code === 200) ? $body : null;
}

function slug_of(string $href): ?string {
    $host = parse_url(STORE, PHP_URL_HOST);
    $p = parse_url(trim($href));
    if ($p === false) return null;
    if (isset($p['host']) && $p['host'] !== $host) return null;
    $path = trim($p['path'] ?? '', '/');
    if ($path === '' || str_contains($path, '/') || str_contains($path, '.') || in_array(strtolower($path), RESERVED, true)) return null;
    return $path;
}

function parse_num(string $s): ?float {
    $s = str_replace([' ', "\u{00A0}", "\u{202F}"], '', $s);
    if (str_contains($s, ',') && str_contains($s, '.')) { $s = str_replace([',', '.'], '', substr($s, 0, strrpos($s, ','))) . '.' . substr($s, strrpos($s, ',') + 1); }
    elseif (str_contains($s, ',') || str_contains($s, '.')) {
        $sep = str_contains($s, ',') ? ',' : '.';
        $tail = strlen($s) - strrpos($s, $sep) - 1;
        $s = $tail === 3 ? str_replace([',', '.'], '', $s) : str_replace($sep, '.', $s);
    }
    return is_numeric($s) ? (float) $s : null;
}

function money_in(string $text): array {
    $out = [];
    if (preg_match_all('/(\d[\d\s\x{00A0}\x{202F}.,]*)\s?(\$\s?US|USD|€|EUR|FCFA|XOF|CFA|\$)/iu', $text, $m, PREG_SET_ORDER)) {
        foreach ($m as $x) {
            $v = parse_num($x[1]);
            if ($v === null) continue;
            $cur = preg_match('/€|EUR/i', $x[2]) ? 'EUR' : (preg_match('/FCFA|XOF|CFA/i', $x[2]) ? 'XOF' : 'USD');
            $out[] = ['raw' => trim(preg_replace('/\s+/u', ' ', $x[0])), 'v' => $v, 'cur' => $cur];
        }
    }
    usort($out, fn($a, $b) => $a['v'] <=> $b['v']);
    $uniq = [];
    foreach ($out as $x) { if (!in_array($x['v'], array_column($uniq, 'v'), true)) $uniq[] = $x; }
    return $uniq;
}

function category_of(string $title): string {
    if (preg_match('/formation|cours|masterclass|bootcamp/i', $title)) return 'formations';
    if (preg_match('/\bia\b|intelligence artificielle|gpt|llm/i', $title)) return 'ia';
    return 'scripts';
}

function build_catalogue(string $html): array {
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    libxml_clear_errors();
    $xp = new DOMXPath($dom);
    $products = [];
    $seen = [];
    foreach ($xp->query('//a[@href]') as $a) {
        $slug = slug_of($a->getAttribute('href'));
        if ($slug === null || isset($seen[$slug])) continue;
        $seen[$slug] = true;
        $card = $a;
        for ($i = 0; $i < 6; $i++) {
            $parent = $card->parentNode;
            if (!$parent instanceof DOMElement || strtolower($parent->nodeName) === 'body') break;
            $others = false;
            foreach ($xp->query('.//a[@href]', $parent) as $o) {
                $s = slug_of($o->getAttribute('href'));
                if ($s !== null && $s !== $slug) { $others = true; break; }
            }
            if ($others) break;
            $card = $parent;
        }
        $text = trim(preg_replace('/\s+/u', ' ', $card->textContent));
        $title = trim(preg_replace('/\s+/u', ' ', $a->textContent));
        $imgs = $xp->query('.//img', $card);
        if ($title === '' && $imgs->length) $title = trim($imgs->item(0)->getAttribute('alt'));
        if ($title === '') $title = str_replace(['-', '_'], ' ', $slug);
        $money = money_in($text);
        $banner = '';
        foreach ($imgs as $img) {
            $src = $img->getAttribute('src') ?: $img->getAttribute('data-src');
            if ($src && preg_match('#^https://#', $src)) { $banner = $src; break; }
        }
        $products[] = [
            'slug' => $slug, 'title' => mb_substr($title, 0, 200),
            'price' => $money ? $money[0]['raw'] : '', 'priceValue' => $money ? $money[0]['v'] : null, 'cur' => $money ? $money[0]['cur'] : '',
            'oldPrice' => count($money) > 1 ? $money[count($money) - 1]['raw'] : '', 'oldValue' => count($money) > 1 ? $money[count($money) - 1]['v'] : null,
            'banner' => $banner, 'categories' => [category_of($title)],
        ];
        if (count($products) >= 60) break;
    }
    return $products;
}

if (file_exists(CACHE) && time() - filemtime(CACHE) < TTL) { readfile(CACHE); exit; }
$html = fetch_url(STORE . '/');
if ($html === null) {
    if (file_exists(CACHE)) { readfile(CACHE); exit; }
    http_response_code(503);
    echo json_encode(['products' => [], 'error' => 'store_unreachable']);
    exit;
}
$products = build_catalogue($html);
$payload = json_encode(['updated' => time(), 'products' => $products], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($products) file_put_contents(CACHE, $payload);
echo $payload;
