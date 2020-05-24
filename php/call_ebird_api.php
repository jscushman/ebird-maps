<?php
header('Content-type:application/json;charset=utf-8');

$data = array(
    'lat' => $_GET['lat'],
    'lng' => $_GET['lng'],
    'back' => $_GET['back'],
    'dist' => $_GET["dist"]
);

$api_file = fopen(".ebird_api_token", "r");
if (!feof($api_file)) {
  $header = fgets($api_file);
} else {
  $header = '';
}
fclose($api_file);

$curl = curl_init();

$url = sprintf("https://api.ebird.org/v2/data/obs/geo/recent/notable?sppLocale=en&detail=full&%s", http_build_query($data));
curl_setopt($curl, CURLOPT_URL, $url);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($curl, CURLOPT_HTTPHEADER, array($header));
curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
$result = curl_exec($curl);
if($result === false) {
  echo 'Curl error: ' . curl_error($curl);
} else {
  echo $result;
}
curl_close($curl);
