
import System;

import System.IO;
import System.Collections.Generic;
#pragma strict

var labelText : String = "This is some text";
var vertices : Vector3[]; 
public static var mesh : Mesh;

var gameMode = "Select";
var toolbarInt = 0;
var toolbarStrings : String[] = ["Select", "Rect select", "Rotate model","Scale model", "Move model", "Move","Scale"];

var verticeSphereTable = new Generic.Dictionary.<int,VerticesAtPoint>();

class VerticesAtPoint {
	public var key : Vector3;
	public var keyIndice : int;
	public var siblings = new Array();
	public var sphere : GameObject;
	
	public function belongsTo(triangleIndice:int) : boolean{
		var triangles = ModelBehaviour.mesh.triangles;
		for(var i=0;i<siblings.length;i++){ 
			var vertice = siblings[i];
			if(vertice==triangles[triangleIndice] || vertice==triangles[triangleIndice+1] || vertice==triangles[triangleIndice+2]){
				return true;
			}
		}
		return false;
	}
}

var lineColor : Color; 
var ZWrite = true; 
var AWrite = true; 
var blend = true; 

var initialPosition : Vector3;
 
private var lines : Vector3[]; 
private var linesArray : Array; 
private var lineMaterial : Material; 


var axisEnabled = Vector3(1,1,1);
var xAxisEnabled = axisEnabled.x?true:false;
var yAxisEnabled = axisEnabled.y?true:false;
var zAxisEnabled = axisEnabled.z?true:false;

var wireframeMode = true;
	
var  fileName;

var initialMesh : Mesh;

var guiDragRect:Rect;

var downCoords = Vector2(-1,-1);
var dragShift:Vector2;
//



var shadowRotation = Vector3.zero;

function Start () {
	mesh = GetComponent(MeshFilter).mesh;
	
	initialMesh = copyMesh(mesh);

	vertices = mesh.vertices;
	GetComponent(MeshCollider).sharedMesh = mesh;
	SetupWireframeRenderer();
	
	initialPosition = transform.localPosition;
	
}

function sceneOnDown(){
	labelText = "down";
	var i=0;
	var initialMousePos = Input.mousePosition;
	var reverse = Input.mousePosition.x<Screen.width/2;
	var amount : float;
	
	/*  Предполагаемый баг в Юнити: запись в Transform.local* значений по индексам не работает */
	
  	 	var amo = 1.1;
     	if(gameMode=='Rotate model'){
     		
     		amo = 15;
     		
     		/*if(reverse){
     			amo*=-1;
     		}*/
     		
     		var rot = Vector3.zero;
     		
     		for( i=0;i<3;i++){ 
     			if(axisEnabled[i]){
					rot[i] = amo;
					break;
				}
			}
			
			//transform.Rotate(rot);
     		
     		var sourceAngles = shadowRotation;
     		while (Input.GetMouseButton(0)){

				amount = (Input.mousePosition.x-initialMousePos.x)/Screen.width*5;
				shadowRotation =sourceAngles+Vector3.Scale(rot,Vector3(amount,amount,amount));
				transform.eulerAngles = shadowRotation+Vector3.zero;
				 
				yield;
				
			}
     		
     		
     	} else if (gameMode=='Scale model'){
     	
     		amo = 0.05;
     		if(reverse){
     			amo*=-1;
     		}
     		
     		var source = transform.localScale;
     		while (Input.GetMouseButton(0)){

				amount = (Input.mousePosition.x-initialMousePos.x)/Screen.width*5;
				transform.localScale =source+Vector3(amount*amo,amount*amo,amount*amo);
				 
				yield;
				
			}
			
     		//this.transform.localScale+=Vector3(amo,amo,amo);
     		
     	} else if (gameMode=='Move model'){
     	
     		amo = .1;
     		if(reverse){
     			amo=-.1;
     		}
     		
     		//	transform.localPosition+=Vector3.Scale(Vector3(amo,amo,amo),axisEnabled);
     		
     		// На основе кода смещения вершин
     		var anchorInWorldSpace = transform.localPosition;
			var screenSpace = Camera.main.WorldToScreenPoint(anchorInWorldSpace);
			var initialScreenSpace = Camera.main.ScreenToWorldPoint(Vector3(Input.mousePosition.x, Input.mousePosition.y, screenSpace.z));
			var initialPosition = transform.localPosition;
			
			while (Input.GetMouseButton(0)){

				var curScreenSpace =  Camera.main.ScreenToWorldPoint(Vector3(Input.mousePosition.x, Input.mousePosition.y, screenSpace.z));
				var offset = curScreenSpace  - initialScreenSpace;
				
     			transform.localPosition=initialPosition+Vector3.Scale(offset,axisEnabled);
				 
				yield;
				
			}
     		
     	} else if (gameMode=='Scale'){
     	
     		var center = Vector3(0,0,0);
     		amo = 0.2;
     		if(reverse){
     			amo=-0.2;
     		}
     	
     		vertices = mesh.vertices;
     		
     		var c = verticeSphereTable.Keys.Count;
     		for(var key in verticeSphereTable.Keys){
				center+= vertices[key];
			} 
			
			/* Не забывать указывать тип не целого числа */
			center = Vector3.Scale(center,Vector3(1.0/c,1.0/c,1.0/c));
			
			var sourceVertices : Vector3[] =  mesh.vertices;
     		while (Input.GetMouseButton(0)){

				amount = (Input.mousePosition.x-initialMousePos.x)/Screen.width/2;
				 
				 for(var key in verticeSphereTable.Keys){
					var complexObject = verticeSphereTable[key];
					var prePosition = sourceVertices[key];
					var centerDiff = prePosition-center;
					
					centerDiff = Vector3.Scale(centerDiff,Vector3(1+amount,1+amount,1+amount));
					var position = center+centerDiff;
					
					var strippedOffset = position;
					
					if(!xAxisEnabled){
		     			strippedOffset.x = prePosition.x;
		     		}  if(!yAxisEnabled){
		     			strippedOffset.y = prePosition.y;
		     		}  if(!zAxisEnabled){
		     			strippedOffset.z = prePosition.z;
		     		}
		     		
		     		position = strippedOffset;
		     		
					for(i=0;i<complexObject.siblings.length;i++){ 
						vertices[complexObject.siblings[i]] = position;
					}
					complexObject.sphere.transform.position = transform.TransformPoint(
						position
					);
				}
				
				mesh.vertices = vertices;
				onMeshUpdate();
			
				yield;
				
			}
			
			
	}
}

function sceneOnDrag(){
	labelText =Input.mousePosition.y.ToString();
	if (gameMode=='Rect select'){
		
		var invertedMPY = Screen.height-Input.mousePosition.y;
		var invertedDCY = Screen.height-downCoords.y;
		guiDragRect = Rect.MinMaxRect(
			Mathf.Min(Input.mousePosition.x,downCoords.x),
			Mathf.Max(invertedMPY,invertedDCY),
			Mathf.Max(Input.mousePosition.x,downCoords.x),
			Mathf.Min(invertedMPY,invertedDCY)
		);
	}
}
function toggleVerticeSelection(verticeIndex : int){
	toggleVerticeSelection(verticeIndex,-1);
}
function toggleVerticeSelection(verticeIndex : int, triangleIndex : int){

		var minIndexDuplicate = verticeIndex;
		for(var i=0;i<verticeIndex;i++){ 
	
			if(
				Vector3.Distance(vertices[i],vertices[verticeIndex])==0 && 
				i<minIndexDuplicate
			){
				minIndexDuplicate=i;
			}
		}

		var targetVerticeIndex = minIndexDuplicate;
		var targetVertice = vertices[targetVerticeIndex];
		
		if(verticeSphereTable.ContainsKey(targetVerticeIndex)){

			Destroy(verticeSphereTable[targetVerticeIndex].sphere);
			verticeSphereTable.Remove(targetVerticeIndex);
			
		} else {
	
			var verticesAtPoint = new VerticesAtPoint();
		
			var verticeSphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
			verticeSphere.transform.parent=this.gameObject.transform;
			verticeSphere.transform.localScale = Vector3(.1,.1,.1);
			verticeSphere.transform.position = transform.TransformPoint(
				targetVertice
			);
			
			
			verticesAtPoint.keyIndice = targetVerticeIndex;
			verticesAtPoint.sphere = verticeSphere;
			verticeSphereTable.Add(targetVerticeIndex,verticesAtPoint);
			
			for(i=0;i<mesh.vertexCount;i++){ 
				if(Vector3.Distance(vertices[i],targetVertice)==0){
					verticesAtPoint.siblings.Push(i);
				}
			}
			
		}
		
}

function sceneOnUp(){
	labelText = "up";
	
	if (gameMode=='Rect select'){
	
		var rect =  Rect.MinMaxRect(
			Mathf.Min(Input.mousePosition.x,downCoords.x),
			Mathf.Min(Input.mousePosition.y,downCoords.y),
			Mathf.Max(Input.mousePosition.x,downCoords.x),
			Mathf.Max(Input.mousePosition.y,downCoords.y)
		);
		
		for(var i=0;i<mesh.vertexCount;i++){ 
		
			var vertice = vertices[i];
			var transformedByTarget = transform.TransformPoint(vertice);
			var screenSpace = Camera.main.WorldToScreenPoint(transformedByTarget);
			
			if(rect.Contains(screenSpace)){
				toggleVerticeSelection(i);
			}
			
		}
	}
	
}



var x = 0;
function Update () {  
  	//labelText = this.transform.localToWorldMatrix.ToString()
  	
  	// Не продолжаем, если пользователь нажимает кнопку
  	if( !GUIUtility.hotControl){
  			 if(Input.GetMouseButtonDown(0) ){
	  	 		sceneOnDown();
	  	 		downCoords = Input.mousePosition;
	  	 		guiDragRect = new Rect(0,0,0,0);
	  	 		dragShift = Vector2(0,0);
		     } else if(downCoords.x>0 && Input.GetMouseButtonUp(0)){
		   		sceneOnUp();
		   		downCoords = Vector2(-1,-1);
		   } else if(downCoords.x>0) {
		   			dragShift = downCoords-Input.mousePosition;
		   			sceneOnDrag();
		   }
  	}
  	
}

function OnMouseDown(){

 	var hit : RaycastHit;
	var ray = Camera.main.ScreenPointToRay(Input.mousePosition);
	var mousePosition3 : Vector3;
	if (Physics.Raycast (ray, hit))
	{
		var filter = hit.collider.GetComponent(MeshFilter);
		mousePosition3 = filter.transform.InverseTransformPoint(hit.point);
	} else {
		return;
	}
	
	vertices = mesh.vertices;
	var triangles = mesh.triangles;
	var targetVerticeIndex = triangles[hit.triangleIndex*3];
	var targetVertice = vertices[targetVerticeIndex];
	
	for(var i=1;i<3;i++){ 
		var candidateVerticeIndice = triangles[hit.triangleIndex*3+i];
		if(Vector3.Distance(mousePosition3,vertices[candidateVerticeIndice])
		   	<
		   Vector3.Distance(mousePosition3,targetVertice)
		){
			targetVerticeIndex = candidateVerticeIndice;
			targetVertice = vertices[targetVerticeIndex];
		}
	}
	
	if(gameMode =='Select'){
	
		toggleVerticeSelection(targetVerticeIndex,hit.triangleIndex);
		return;
		
	} else if (gameMode =='Move'){
	
	
	/* 
		Основа -- из демо.
		Дальше -- накрутки для множества вершин, сосредоточенных в одной точке.
		Дальше -- накрутки для нескольких таких множеств вершин.
		Дальше -- учет не только положения камеры, но и трансформации ImageTarget и Модели.
	*/
	
		var anchorInWorldSpace = transform.TransformPoint(targetVertice);
		var screenSpace = Camera.main.WorldToScreenPoint(anchorInWorldSpace);
		var initialScreenSpace = transform.InverseTransformPoint(Camera.main.ScreenToWorldPoint(Vector3(Input.mousePosition.x, Input.mousePosition.y, screenSpace.z)));
		var oldPositions = mesh.vertices;
		
		while (Input.GetMouseButton(0)){

			var curScreenSpace =  transform.InverseTransformPoint(Camera.main.ScreenToWorldPoint(Vector3(Input.mousePosition.x, Input.mousePosition.y, screenSpace.z)));
			var offset = curScreenSpace  - initialScreenSpace;
			 
			vertices = mesh.vertices;
			labelText = offset.ToString();
			for(var key in verticeSphereTable.Keys){
				var complexObject = verticeSphereTable[key];
				var prePosition = oldPositions[key];
				
				var strippedOffset = Vector3.Scale(offset,axisEnabled);
	     		
				var position = prePosition + strippedOffset;
				for(i=0;i<complexObject.siblings.length;i++){ 
					vertices[complexObject.siblings[i]] = position;
				}
				complexObject.sphere.transform.position = transform.TransformPoint(
					position
				);
			}
			
			mesh.vertices = vertices;
			onMeshUpdate();
			
			yield;
			
		}
		
	}
	
}

function onMeshUpdate(){

	mesh.RecalculateNormals();
	
	/*  http://forum.unity3d.com/threads/32467-How-to-update-a-mesh-collider?p=401202&viewfull=1#post401202 */
	GetComponent(MeshCollider).sharedMesh = null;
	GetComponent(MeshCollider).sharedMesh = mesh;

	updateWireframeGeometry();
}

function OnGUI () {

	var bH = Screen.height/20;
	
    var TWidth = Screen.width/3;
    
    var betweenButtonPad = 3;
		
	GUI.skin.button.wordWrap = true;
	
	var pad = Screen.height/40;
	var twoLineButtonHeight = bH*1.5;
	var twoLineButtonWidth = TWidth/2.0;

	GUI.skin.label.fontSize = Screen.height/40;
	GUI.skin.toggle.fontSize = Screen.height/25;
	GUI.skin.button.fontSize = Screen.height/50;
	
	var lSRWidth =twoLineButtonWidth;
    
    if(verticeSphereTable.Count!=2){
    	GUI.enabled = false;
    }
    
    if (GUI.Button (Rect (pad,pad,twoLineButtonWidth,twoLineButtonHeight), "Insert vertice")) {
			
			var a = new VerticesAtPoint[2];
			verticeSphereTable.Values.CopyTo(a,0);
			addVerticeBetweenVerticeGroups(a[0],a[1]);
	}
	
	GUI.enabled = true;
	
	 if(verticeSphereTable.Count!=4){
    	GUI.enabled = false;
    }
    
	if (GUI.Button (Rect (pad+twoLineButtonWidth+betweenButtonPad,pad,twoLineButtonWidth,twoLineButtonHeight), "Extrude")) {
			
			extrude();
	}
	
	GUI.enabled = true;
	
	
	 if (GUI.Button (Rect (Screen.width-lSRWidth-pad,Screen.height-bH-pad,lSRWidth,bH), "Save")) {
			saveModel();
	}
	
	 if (GUI.Button (Rect (Screen.width-lSRWidth-pad,Screen.height-2*bH-pad-betweenButtonPad,lSRWidth,bH), "Reset")) {
			resetModel();
	}
	
	 if (GUI.Button (Rect (Screen.width-lSRWidth-pad,Screen.height-3*bH-pad-betweenButtonPad*2,lSRWidth,bH), "Load")) {
			loadModel();
	}
	
	 if (GUI.Button (Rect (Screen.width-lSRWidth-pad,Screen.height-4.5*bH-pad-betweenButtonPad*3,lSRWidth,bH*1.5), "Reset selection")) {
			clearSelection();
	}
	
	if(downCoords.x>0){
		GUI.Box(guiDragRect, "");
		
	}
	
	
	//GUI.Label(Rect(Screen.width/4,Screen.height/2,Screen.width/2,Screen.height/2), labelText);
	
	
	/*GUI.skin.toggle.fontSize = Screen.height/55;
	
	var toggle = GUI.Toggle (Rect (pad,Screen.height-Screen.height/40-pad,Screen.width/3.5,bH),wireframeMode, "Wireframe");*/
	
	GUI.skin.toggle.fontSize = GUI.skin.button.fontSize;
	
	GUI.skin.toggle.alignment = TextAnchor.MiddleLeft;
	var toggle = GUI.Toggle (Rect (pad,Screen.height-bH-pad,Screen.width/3.5,bH),wireframeMode, "Wireframe", "Button");
	

	
	
    if (toggle != wireframeMode) {
        wireframeMode = toggle;
	    updateWireframeGeometry();
    }
    
    toolbarInt = GUI.SelectionGrid (new Rect (Screen.width-TWidth-pad,pad,TWidth,bH*6), toolbarInt, toolbarStrings, 2);
	gameMode = toolbarStrings[toolbarInt];   

	 GUI.color  = Color.red;
    
    GUI.skin.toggle.fontSize = Screen.height/25;
    GUI.backgroundColor = Color.white;
	 GUI.skin.toggle.alignment = TextAnchor.MiddleLeft;
	 var toggleWidth = twoLineButtonWidth/3*2;
	 var toggleHeight = toggleWidth;
	 
	 toggle = GUI.Toggle (Rect (pad,pad+toggleHeight*3,toggleWidth,toggleHeight),xAxisEnabled, "X", "Button");
	 
	 if (toggle != xAxisEnabled) {
        xAxisEnabled = toggle;
        axisEnabled.x=toggle?1:0; 
    }
	 GUI.color  = Color.green;
	 toggle = GUI.Toggle (Rect (pad,pad+toggleHeight*4,toggleWidth,toggleHeight),yAxisEnabled, "Y", "Button");
	  if (toggle != yAxisEnabled) {
        yAxisEnabled = toggle;
        axisEnabled.y=toggle?1:0;
    }
	 GUI.color  = Color.blue;
	 toggle = GUI.Toggle (Rect (pad,pad+toggleHeight*5,toggleWidth,toggleHeight),zAxisEnabled, "Z", "Button");
	  if (toggle != zAxisEnabled) {
       zAxisEnabled = toggle;
        axisEnabled.z=toggle?1:0;
    }
    
    //

}

// IO

function saveModel(){

		labelText = Application.persistentDataPath;
		var fileName = "SerializedMesh.data.txt"; 
		var saveTangents = false;

	    var inputMesh = GetComponent(MeshFilter).mesh;
	    var fullFileName = Application.persistentDataPath + "/" + fileName;
	    
	    var csScript : ObjExporter = this.GetComponent("ObjExporter"); 
	    csScript.MeshToFile(GetComponent(MeshFilter),Application.persistentDataPath + "/Mesh.obj");
	    if(true) return;
}


function loadModel(){

		var csScript : ObjImporter = this.GetComponent("ObjImporter"); 
		var filePath = System.IO.Path.Combine(Application.persistentDataPath, "SerializedMesh.data.txt");
		
		mesh = csScript.ImportFile (System.IO.Path.Combine(Application.persistentDataPath, "Mesh.obj"));
	    
	   swapMesh(mesh); 
		
}
function resetModel(){ 
		swapMesh(copyMesh(initialMesh));
		
}

function swapMesh(src : Mesh){


		clearSelection();
		
		transform.localPosition = initialPosition;
		transform.localRotation = Quaternion(0,0,0,0);
		transform.localScale = Vector3(.3,.3,.3);
		shadowRotation = Vector3.zero;
			
		mesh = src;
		GetComponent(MeshFilter).mesh = src;
		
		onMeshUpdate();

}

function copyMesh(src : Mesh){

	var copy = new Mesh();

	copy.vertices = src.vertices;

	copy.triangles = src.triangles;

	copy.uv = src.uv;

	copy.normals = src.normals;

	copy.colors = src.colors;

	copy.tangents = src.tangents;
	
	return copy;
	
 }   

// Wireframe

function SetupWireframeRenderer(){
    lineMaterial = new Material("Shader \"Lines/Colored Blended\" { SubShader { Pass { Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Front Fog { Mode Off } } } }");
    lineMaterial.hideFlags = HideFlags.HideAndDontSave;
    lineMaterial.shader.hideFlags = HideFlags.HideAndDontSave;
    updateWireframeGeometry();
}

function updateWireframeGeometry(){

	if(!wireframeMode) return;
    linesArray = new Array();
    var vertices = mesh.vertices;
    var triangles = mesh.triangles;
    for (var i = 0; i < triangles.length / 3; i++){

        linesArray.Add(vertices[triangles[i * 3]]);

        linesArray.Add(vertices[triangles[i * 3 + 1]]);

        linesArray.Add(vertices[triangles[i * 3 + 2]]);

    }
    lines = linesArray.ToBuiltin(Vector3);

}

function OnRenderObject() {    
   if(!wireframeMode) return;
   lineMaterial.SetPass(0); 
 
   
   GL.PushMatrix(); 
   GL.MultMatrix(transform.localToWorldMatrix); 
   GL.Begin(GL.LINES); 
   GL.Color(lineColor); 
 
   for (var i = 0; i < lines.length / 3; i++) 
   { 
      GL.Vertex(lines[i * 3]); 
      GL.Vertex(lines[i * 3 + 1]); 
 
      GL.Vertex(lines[i * 3 + 1]); 
      GL.Vertex(lines[i * 3 + 2]); 
 
      GL.Vertex(lines[i * 3 + 2]); 
      GL.Vertex(lines[i * 3]); 
   } 
 
   GL.End(); 
   GL.PopMatrix();
}

// Insert vertice

function addVerticeBetweenVerticeGroups(startVerticeGroup : VerticesAtPoint, endVerticeGroup : VerticesAtPoint){
	var trianglesFound = 0;
	var triangles = mesh.triangles;
	for(var i=0;i<startVerticeGroup.siblings.length;i++){ 
		var cSV = startVerticeGroup.siblings[i];
		for(var k=0;k<triangles.length;k+=3){
			if(triangles[k]==cSV || triangles[k+1]==cSV || triangles[k+2]==cSV){
				for(var j=0;j<endVerticeGroup.siblings.length;j++){ 
					var cEV = endVerticeGroup.siblings[j];
					if(triangles[k]==cEV || triangles[k+1]==cEV || triangles[k+2]==cEV){
						
						splitTriangle(k,cSV,cEV);
						trianglesFound++;
						if( trianglesFound==2){
						
							onMeshUpdate();
							return;
						 }
					}
				}
			}
		}
	}
}

function splitTriangle(indexInTriangleArray : int,  startVerticeIndex : int,  endVerticeIndex : int){

	var vertices = new List.<Vector3> (mesh.vertices);
	var triangles = new List.<int>(mesh.triangles);
	
	var newVertice = (vertices[startVerticeIndex] +vertices[endVerticeIndex])/2;
	
    var i = indexInTriangleArray;
	while(triangles[i]==endVerticeIndex || triangles[i]==startVerticeIndex){
		var tmp = triangles[i];
		triangles[i]=triangles[i+1];
		triangles[i+1]=triangles[i+2];
		triangles[i+2]=tmp;
	}
	
	for(i=0;i<2;i++){ 
		
		vertices.Add(newVertice);
	
		// Первый подтреугольник добавлен в хвост массива
		var firstVerticeOfTriangle = triangles[indexInTriangleArray];
		var secondtVerticeOfTriangle = triangles[indexInTriangleArray+1];
		triangles.Add(firstVerticeOfTriangle);
		triangles.Add(secondtVerticeOfTriangle);
		triangles.Add(mesh.vertices.length+i*2);
		
		vertices.Add(newVertice);
		
		// Второй подтреугольник -- на месте бывшего исходного
		triangles[indexInTriangleArray+1] = mesh.vertices.length+i*2+1;
	}
	
	mesh.vertices = vertices.ToArray();
	mesh.triangles = triangles.ToArray();
	
}

// 

function clearSelection(){
	for( i in verticeSphereTable.Keys){
		Destroy(verticeSphereTable[i].sphere);
	}
	
	verticeSphereTable = new Generic.Dictionary.<int,VerticesAtPoint>();
}

function posMod(arg:int, mod:int) : int{
	return (arg+mod)%mod;
}

 function extrude(){

	/*
		Псевдо
		
		дано: четыре исходные группы вершин, два треугольника
		
		получить произвольно упорядоченный набор треугольников 
		a,b
		
		получить упорядоченную по часовой стрелке четверку вершин треугольников
		a0,a1,a2,b1
			Взять каждую вершину Ax первого треугольника, записать её номер в тройке
			прикладывать поочередно к трем вершинам второго треугольника, пока не получим совпадение
				если совпадение есть с Bx и Bx+1 не является Ax-1, то искомая четверка
				Ax-2 Ax-1 Ax Bx+1
				разбить цикл
			
		
		Сделать боковые треугольники
			создать дополнительно 4 вершины на каждой стороне
				для каждой стороны создать две копии и две смещенные вершины
				создать два треугольника
					начальная нижняя - вторая нижняя - вторая верхняя
					вторая верхняя - первая верхняя - первая нижняя
			
		Сделать крышку
			из исходных вершин, сместив их на вектор
	
	*/
	
	var vertices = new List.<Vector3> (mesh.vertices);
	var triangles = new List.<int>(mesh.triangles);
	var extrusion : Vector3;
	
	var a = new VerticesAtPoint[4];
	verticeSphereTable.Values.CopyTo(a,0);
	
	// Находим треугольники
	
	var triangleIndices =  new List.<int>();
	for(var i=0; i<triangles.Count; i+=3){
		var verticesIn = 0;
		for(vertice in verticeSphereTable.Values){
			if(vertice.belongsTo(i)){
				verticesIn++;
			}
		}
		if(verticesIn==3){
			 triangleIndices.Add(i);
			 if(triangleIndices.Count==2) break;
		 } 
	}
	
	if(triangleIndices.Count<2) return;
	
	// Составляем отсортированный список вершин
	
	var verticeIndexes = new int[4];
	verticeIndexes[0]=-1;
	for( i=0;i<3;i++){ 
		verticeIndexes[2]=triangles[triangleIndices[0]+i];
		for(var j=0;j<3;j++){ 
			var candidateVerticeIndice = triangles[triangleIndices[1]+j];
			if(
				candidateVerticeIndice==verticeIndexes[2] 
				&& 
				triangles[triangleIndices[0]+posMod(i-1,3)] != triangles[triangleIndices[1]+posMod(j+1,3)]
			){
					verticeIndexes[3]=triangles[triangleIndices[1]+posMod(j+1,3)];
					verticeIndexes[1]=triangles[triangleIndices[0]+posMod(i-1,3)];
					verticeIndexes[0]=triangles[triangleIndices[0]+posMod(i-2,3)];
					break;
			}
		}
		if(verticeIndexes[0]>0) break;
	}
	
	extrusion = Vector3.Scale(mesh.normals[verticeIndexes[1]],Vector3(.2,.2,.2));
	
	/*  Боковины */
	
	var startIndex = mesh.vertices.Length;
	for( i=0;i<4;i++){ 
	
		var srcVertices : Vector3[] = [
			vertices[
				verticeIndexes[i]
			],
			vertices[
				verticeIndexes[(i+1)%4]
			]
		];
		
		for( j=0;j<2;j++){ 
			vertices.Add(Vector3(srcVertices[j].x,srcVertices[j].y,srcVertices[j].z));
			vertices.Add(srcVertices[j]+extrusion);
		}
		
		triangles.Add(startIndex);
		triangles.Add(startIndex+2);
		triangles.Add(startIndex+3);
		
		triangles.Add(startIndex);
		triangles.Add(startIndex+3);
		triangles.Add(startIndex+1);
		
		startIndex+=4;
	}
	
	/*  Крышка */
	
	for( i=0;i<verticeIndexes.length;i++){ 
		var vertice = vertices[verticeIndexes[i]];
		 vertices[verticeIndexes[i]]=extrusion+vertice;
	}
	
	mesh.vertices = vertices.ToArray();
	mesh.triangles = triangles.ToArray();
	
	onMeshUpdate();
	
	this.vertices = mesh.vertices;
	clearSelection();
	for( i=0;i<verticeIndexes.length;i++){ 
		toggleVerticeSelection(verticeIndexes[i]);
	}
	
}