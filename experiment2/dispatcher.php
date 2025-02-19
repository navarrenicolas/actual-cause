<?php
// Get a global counter from server and update counter
$counter_file = "/tmp/actual-cause-counter-1";
$counter_val = file_get_contents($counter_file);
file_put_contents($counter_file, $counter_val + 1);

// Possible redirections
$redirects = array("https://web-risc.ens.fr/~nnavarre/experiments/ac1/acg/main1.html",
                    "https://web-risc.ens.fr/~nnavarre/experiments/ac1/acg/main2.html",
                     "https://web-risc.ens.fr/~nnavarre/experiments/ac1/acg/main3.html",
                );
// Redirect user to the next link
header("Location: " . $redirects[$counter_val % count($redirects)]);
?>

