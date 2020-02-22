<?php
$county = $_GET['county'];
if (isset($county)) {
  $region_db = new SQLite3('../db/ebird_region_data.sqlite');
  $region_query = "SELECT name FROM Counties WHERE code = \"$county\"";
  $res = $region_db->query($region_query);
  $county_name_row = $res->fetchArray();
  $county_name = $county_name_row['name'];
}
$obs_db = new SQLite3('../db/ebird_obs_data.sqlite');
$state = $_GET['state'];
$query = "SELECT DISTINCT common_name FROM Observations WHERE state_id = \"$state\"";
if (isset($county)) {
  $query .= " AND county_name = \"$county_name\"";
}
$res = $obs_db->query($query);
$species = array();

while ($row = $res->fetchArray()) {
  array_push($species, $row['common_name']);
}
echo json_encode($species);
?>
