<?php
$obs_db = new SQLite3('db/ebird_region_data.sqlite');
$country = $_GET["country"];
$query = "SELECT name, code FROM States WHERE code LIKE '$country-%'";
$res = $obs_db->query($query);
$states = array();
while ($row = $res->fetchArray()) {
  $array_entry = array('name' => $row['name'], 'code' => $row['code']);
  array_push($states, $array_entry);
}
echo json_encode($states);
?>