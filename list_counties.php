<?php
$obs_db = new SQLite3('db/ebird_region_data.sqlite');
$state = $_GET["state"];
$query = "SELECT name, code FROM Counties WHERE code LIKE '$state-%'";
$res = $obs_db->query($query);
$counties = array();
while ($row = $res->fetchArray()) {
  $array_entry = array('name' => $row['name'], 'code' => $row['code']);
  array_push($counties, $array_entry);
}
echo json_encode($counties);
?>