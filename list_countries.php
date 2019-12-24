<?php
$obs_db = new SQLite3('db/ebird_region_data.sqlite');
$query = "SELECT name, code FROM Countries";
$res = $obs_db->query($query);
$countries = array();
while ($row = $res->fetchArray()) {
  $array_entry = array('name' => $row['name'], 'code' => $row['code']);
  array_push($countries, $array_entry);
}
echo json_encode($countries);
?>