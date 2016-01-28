#pragma strict

var userDefinedTargetEventHandler : UserDefinedTargetEventHandler;// = this.GetComponent("UserDefinedTargetEventHandler"); 
 
function Start () {

	userDefinedTargetEventHandler = GameObject.FindObjectOfType(typeof(UserDefinedTargetEventHandler)) as UserDefinedTargetEventHandler;
	userDefinedTargetEventHandler.Init();
	
}

function OnGUI () {

	var bH = Screen.height/20;
    
    var betweenButtonPad = 3;
	
	var pad = Screen.height/40; 

	GUI.skin.button.fontSize = Screen.height/50;
	
 
	
	var rect = new Rect (pad,Screen.height-bH*2-pad-betweenButtonPad,Screen.width/3.5,bH); 
	
	if (GUI.Button (rect, "Set target")) {
		userDefinedTargetEventHandler.BuildNewTarget();
	}
	
}

function Update () {

}