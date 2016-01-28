#pragma strict

function Start () {

}

function Update () {

}

function Awake ()

{

    LeaveScene ();

}

 

function LeaveScene ()

{

    yield WaitForSeconds (1.0);

    Application.LoadLevel("MainScene");

}