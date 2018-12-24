<?php
define("IMAGEDIR", __DIR__ . "/../../public/images");
if (!is_dir(IMAGEDIR)) {
    mkdir(IMAGEDIR);
}

$csv = fopen(__DIR__ . "/data_cars.csv", 'r');
$i = 0;
while ($line = fgetcsv($csv)) {
    if ($i++ == 0) {
        continue;
    }

    $image = explode("?", $line[2])[0];
    $filename = IMAGEDIR . "/$image";

    if (file_exists($filename)) {
        echo "File $image already exists, skipping...\n";
        continue;
    }

    $url = "https://transportnsw.info/sites/default/files/styles/wysiwyg_large_1140/public/image/2018/04/$image";
    
    //Check for 404
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER,1);
    curl_setopt($ch, CURLOPT_TIMEOUT,10);
    $output = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpcode == "200") {
        if (!copy($url, $filename)) {
            echo "Failed to download $url\n";
        } else {
            echo "Successfully downloaded $image\n";
        }
    } else {
        echo "HTTP $httpcode, couldn't find $url\n";
    }
}