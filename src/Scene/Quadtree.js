/**
* Generated On: 2015-10-5
* Class: Quadtree
* Description: Structure de données spatiales possedant jusqu'à 4 Nodes
*/


define('Scene/Quadtree',['Scene/Node','Scene/BoudingBox'], function(Node,BoudingBox){

    function Quadtree(tileType,schemeTile){
        
        Node.call( this );
        this.schemeTile = schemeTile;
        this.tileType   = tileType;
        
        for (var i = 0; i < this.schemeTile.rootCount(); i++) 
        {
            var tile = new this.tileType(this.schemeTile.getRoot(i));
            tile.position.set(tile.bbox.center.x,tile.bbox.center.y,0);
            this.add(tile); 
            //this.subdivide(tile);
        }
        
    }
    
    Quadtree.prototype = Object.create( Node.prototype );

    Quadtree.prototype.constructor = Quadtree;
    
    Quadtree.prototype.northWest = function(node)
    {
        return node.children[0];
    };
    
    Quadtree.prototype.northEast = function(node)
    {
        return node.children[1];
    };
    
    Quadtree.prototype.southWest = function(node)
    {
        return node.children[2];
    };
    
    Quadtree.prototype.southEast = function(node)
    {
        return node.children[3];
    };    
    
   /**
    * return 4 equals subdivisions of the bouding box
    * @param {type} node
    * @returns {Array} four bounding box
    */
    Quadtree.prototype.subdivide = function(node)
    {
        var subdiv = [];
        
        var bbox = node.bbox;
        
        subdiv.push(new BoudingBox(bbox.minLongitude,bbox.center.x,bbox.center.y,bbox.maxLatitude));
        subdiv.push(new BoudingBox(bbox.center.x,bbox.maxLongitude,bbox.center.y,bbox.maxLatitude));
        subdiv.push(new BoudingBox(bbox.minLongitude,bbox.center.x,bbox.minLatitude,bbox.center.y));
        subdiv.push(new BoudingBox(bbox.center.x,bbox.maxLongitude,bbox.minLatitude,bbox.center.y));        
        
        node.subdivise(subdiv);
    };
   
    return Quadtree;

});