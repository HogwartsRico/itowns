/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',[    
    'Core/defaultValue',
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Globe/EllipsoidTileMesh',
    'Globe/Atmosphere',
    'Core/System/Capabilities',
    'Core/Geographic/CoordCarto',
    'Renderer/BasicMaterial',
    'THREE'], function(defaultValue,Layer,Quadtree,SchemeTile,MathExt,EllipsoidTileMesh,Atmosphere,Capabilities,CoordCarto,BasicMaterial,THREE){

    function Globe(scale){
        //Constructor
        
        Layer.call( this );        
        
        scale       = defaultValue(scale,1.0);
        var caps    = new Capabilities();       
        this.NOIE   = !caps.isInternetExplorer()  ;
                
        this.size       = new THREE.Vector3(6378137, 6356752.3142451793, 6378137).multiplyScalar(scale);
        this.terrain    = new Quadtree(EllipsoidTileMesh,this.SchemeTileWMTS(2),this.size) ;        
        this.atmosphere = this.NOIE ? new Atmosphere(this.size) : undefined;
        
        this.batiments  = new Layer();
        
        var material    = new BasicMaterial(new THREE.Color(1,0,0));
        var geometry    = new THREE.SphereGeometry(200);       
        var batiment    = new THREE.Mesh( geometry, material );
        var position    = this.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(-48.87,0,200));
        batiment.frustumCulled  = false;
        //material.wireframe      = true;
        batiment.position.copy(position);
   
        var material2    = new BasicMaterial(new THREE.Color(1,0.5,1));        
        var batiment2    = new THREE.Mesh( geometry, material2 );
        var position2    = this.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(-48.87,0,100));
        batiment2.frustumCulled  = false;
        material2.wireframe      = true;
        batiment2.position.copy(position2);
        
        //this.batiments.add( batiment );        
        //this.batiments.add( batiment2 );
        
        this.add(this.terrain);                
        this.add(this.batiments);
        
        if(this.atmosphere !== undefined)
            this.add(this.atmosphere);
        
    }

    Globe.prototype = Object.create( Layer.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Globe.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.SchemeTileWMTS = function(type){
        //TODO: Implement Me 
        if(type === 2)
        {
            var schemeT = new SchemeTile();
            schemeT.add(0,MathExt.PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            schemeT.add(MathExt.PI,MathExt.TWO_PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            return schemeT;
        }

    };
    
    Globe.prototype.showAtmosphere = function(show)
    {
         if(this.atmosphere !== undefined)
             this.atmosphere.visible = show;

    };
    
    
    Globe.prototype.ellipsoid = function()
    {
        return this.terrain.interCommand.managerCommands.providers[0].ellipsoid;
    };
    
    return Globe;
    
});


