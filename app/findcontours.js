/** Finding contours in binary images and approximating polylines.
 *  Implements the same algorithms as OpenCV's findContours and approxPolyDP.
 *  <p>
 *  Made possible with support from The Frank-Ratchye STUDIO For Creative Inquiry
 *  At Carnegie Mellon University. http://studioforcreativeinquiry.org/
 *  @author Lingdong Huang
 */
var FindContours = new function(){let that = this;
  
  let N_PIXEL_NEIGHBOR = 8;

  // give pixel neighborhood counter-clockwise ID's for
  // easier access with findContour algorithm
  function neighborIDToIndex(i, j, id){
    if (id == 0){return [i,j+1];}
    if (id == 1){return [i-1,j+1];}
    if (id == 2){return [i-1,j];}
    if (id == 3){return [i-1,j-1];}
    if (id == 4){return [i,j-1];}
    if (id == 5){return [i+1,j-1];}
    if (id == 6){return [i+1,j];}
    if (id == 7){return [i+1,j+1];}
    return null;
  }
  function neighborIndexToID(i0, j0, i, j){
    let di = i - i0;
    let dj = j - j0;
    if (di == 0 && dj == 1){return 0;}
    if (di ==-1 && dj == 1){return 1;}
    if (di ==-1 && dj == 0){return 2;}
    if (di ==-1 && dj ==-1){return 3;}
    if (di == 0 && dj ==-1){return 4;}
    if (di == 1 && dj ==-1){return 5;}
    if (di == 1 && dj == 0){return 6;}
    if (di == 1 && dj == 1){return 7;}
    return -1;
  }

  // first counter clockwise non-zero element in neighborhood
  function ccwNon0(F, w, h, i0, j0, i, j, offset){
    let id = neighborIndexToID(i0,j0,i,j);
    for (let k = 0; k < N_PIXEL_NEIGHBOR; k++){
      let kk = (k+id+offset + N_PIXEL_NEIGHBOR*2) % N_PIXEL_NEIGHBOR;
      let ij = neighborIDToIndex(i0,j0,kk);
      if (F[ij[0]*w+ij[1]]!=0){
        return ij;
      }
    }
    return null;
  }

  // first clockwise non-zero element in neighborhood
  function cwNon0(F, w, h, i0, j0, i, j, offset){
    let id = neighborIndexToID(i0,j0,i,j);
    for (let k = 0; k < N_PIXEL_NEIGHBOR; k++){
      let kk = (-k+id-offset + N_PIXEL_NEIGHBOR*2) % N_PIXEL_NEIGHBOR;
      let ij = neighborIDToIndex(i0,j0,kk);
      if (F[ij[0]*w+ij[1]]!=0){
        return ij;
      }
    }
    return null;
  }

  /**
   * Find contours in a binary image
   * <p>
   * Implements Suzuki, S. and Abe, K.
   * Topological Structural Analysis of Digitized Binary Images by Border Following.
   * <p>
   * See source code for step-by-step correspondence to the paper's algorithm
   * description.
   * @param  F    The bitmap, stored in 1-dimensional row-major form. 
   *              0=background, 1=foreground, will be modified by the function
   *              to hold semantic information
   * @param  w    Width of the bitmap
   * @param  h    Height of the bitmap
   * @return      An array of contours found in the image.
   * @see         Contour
   */
   that.findContours = function(F, w, h) {
    // Topological Structural Analysis of Digitized Binary Images by Border Following.
    // Suzuki, S. and Abe, K., CVGIP 30 1, pp 32-46 (1985)
    let nbd = 1;
    let lnbd = 1;

    let contours = [];
    
    // Without loss of generality, we assume that 0-pixels fill the frame 
    // of a binary picture
    for (let i = 1; i < h-1; i++){
      F[i*w] = 0; F[i*w+w-1]=0;
    }
    for (let i = 0; i < w; i++){
      F[i] = 0; F[w*h-1-i]=0;
    }

    //Scan the picture with a TV raster and perform the following steps 
    //for each pixel such that fij # 0. Every time we begin to scan a 
    //new row of the picture, reset LNBD to 1.
    for (let i = 1; i < h-1; i++) {
      lnbd = 1;

      for (let j = 1; j < w-1; j++) {
        
        let i2 = 0, j2 = 0;
        if (F[i*w+j] == 0) {
          continue;
        }
        //(a) If fij = 1 and fi, j-1 = 0, then decide that the pixel 
        //(i, j) is the border following starting point of an outer 
        //border, increment NBD, and (i2, j2) <- (i, j - 1).
        if (F[i*w+j] == 1 && F[i*w+(j-1)] == 0) {
          nbd ++;
          i2 = i;
          j2 = j-1;
          
          
        //(b) Else if fij >= 1 and fi,j+1 = 0, then decide that the 
        //pixel (i, j) is the border following starting point of a 
        //hole border, increment NBD, (i2, j2) <- (i, j + 1), and 
        //LNBD + fij in case fij > 1.  
        } else if (F[i*w+j]>=1 && F[i*w+j+1] == 0) {
          nbd ++;
          i2 = i;
          j2 = j+1;
          if (F[i*w+j]>1) {
            lnbd = F[i*w+j];
          }
          
          
        } else {
          //(c) Otherwise, go to (4).
          //(4) If fij != 1, then LNBD <- |fij| and resume the raster
          //scan from pixel (i,j+1). The algorithm terminates when the
          //scan reaches the lower right corner of the picture
          if (F[i*w+j]!=1){lnbd = Math.abs(F[i*w+j]);}
          continue;
          
        }
        //(2) Depending on the types of the newly found border 
        //and the border with the sequential number LNBD 
        //(i.e., the last border met on the current row), 
        //decide the parent of the current border as shown in Table 1.
        // TABLE 1
        // Decision Rule for the Parent Border of the Newly Found Border B
        // ----------------------------------------------------------------
        // Type of border B'
        // \    with the sequential
        //     \     number LNBD
        // Type of B \                Outer border         Hole border
        // ---------------------------------------------------------------     
        // Outer border               The parent border    The border B'
        //                            of the border B'
        //
        // Hole border                The border B'      The parent border
        //                                               of the border B'
        // ----------------------------------------------------------------
        
        let B = {};
        B.points = []
        B.points.push([j,i]);
        B.isHole = (j2 == j+1);
        B.id = nbd;
        contours.push(B);

        let B0 = {}
        for (let c = 0; c < contours.length; c++){
          if (contours[c].id == lnbd){
            B0 = contours[c];
            break;
          }
        }
        if (B0.isHole){
          if (B.isHole){
            B.parent = B0.parent;
          }else{
            B.parent = lnbd;
          }
        }else{
          if (B.isHole){
            B.parent = lnbd;
          }else{
            B.parent = B0.parent;
          }
        }
        
        //(3) From the starting point (i, j), follow the detected border: 
        //this is done by the following substeps (3.1) through (3.5).
        
        //(3.1) Starting from (i2, j2), look around clockwise the pixels 
        //in the neigh- borhood of (i, j) and tind a nonzero pixel. 
        //Let (i1, j1) be the first found nonzero pixel. If no nonzero 
        //pixel is found, assign -NBD to fij and go to (4).
        let i1 = -1, j1 = -1;
        let i1j1 = cwNon0(F,w,h,i,j,i2,j2,0);
        if (i1j1 == null){
          F[i*w+j] = -nbd;
          //go to (4)
          if (F[i*w+j]!=1){lnbd = Math.abs(F[i*w+j]);}
          continue;
        }
        i1 = i1j1[0]; j1 = i1j1[1];
        
        // (3.2) (i2, j2) <- (i1, j1) ad (i3,j3) <- (i, j).
        i2 = i1;
        j2 = j1;
        let i3 = i;
        let j3 = j;
        
        while (true){

          //(3.3) Starting from the next elementof the pixel (i2, j2) 
          //in the counterclock- wise order, examine counterclockwise 
          //the pixels in the neighborhood of the current pixel (i3, j3) 
          //to find a nonzero pixel and let the first one be (i4, j4).
          
          let i4j4 = ccwNon0(F,w,h,i3,j3,i2,j2,1);
   
          var i4 = i4j4[0];
          var j4 = i4j4[1];

          contours[contours.length-1].points.push([j4,i4]);
          
          //(a) If the pixel (i3, j3 + 1) is a O-pixel examined in the
          //substep (3.3) then fi3, j3 <-  -NBD.
          if (F[i3*w+j3+1] == 0){
            F[i3*w+j3] = -nbd;
            
          //(b) If the pixel (i3, j3 + 1) is not a O-pixel examined 
          //in the substep (3.3) and fi3,j3 = 1, then fi3,j3 <- NBD.
          }else if (F[i3*w+j3] == 1){
            F[i3*w+j3] = nbd;
          }else{
            //(c) Otherwise, do not change fi3, j3.
          }
          
          //(3.5) If (i4, j4) = (i, j) and (i3, j3) = (i1, j1) 
          //(coming back to the starting point), then go to (4);
          if (i4 == i && j4 == j && i3 == i1 && j3 == j1){
            if (F[i*w+j]!=1){lnbd = Math.abs(F[i*w+j]);}
            break;
            
          //otherwise, (i2, j2) + (i3, j3),(i3, j3) + (i4, j4), 
          //and go back to (3.3).
          }else{
            i2 = i3;
            j2 = j3;
            i3 = i4;
            j3 = j4;
          }
        }
      }
    }
    return contours;
  }


  function pointDistanceToSegment(p, p0, p1) {
    // https://stackoverflow.com/a/6853926
    let x = p[0];   let y = p[1];
    let x1 = p0[0]; let y1 = p0[1];
    let x2 = p1[0]; let y2 = p1[1];
    let A = x - x1; let B = y - y1; let C = x2 - x1; let D = y2 - y1;
    let dot = A*C+B*D;
    let len_sq = C*C+D*D;
    let param = -1;
    if (len_sq != 0) {
      param = dot / len_sq;
    }
    let xx; let yy;
    if (param < 0) {
      xx = x1; yy = y1;
    }else if (param > 1) {
      xx = x2; yy = y2;
    }else {
      xx = x1 + param*C;
      yy = y1 + param*D;
    }
    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx*dx+dy*dy);
  }

  /**
   * Simplify contour by removing definately extraneous vertices, 
   * without modifying shape of the contour.
   * @param  polyline  The vertices
   * @return           A simplified copy
   * @see              approxPolyDP
   */
  that.approxPolySimple = function(polyline){
    let epsilon = 0.1;
    if (polyline.length <= 2){
      return polyline;
    }
    let ret = []
    ret.push(polyline[0].slice());
      
    for (let i = 1; i < polyline.length-1; i++){
      let   d = pointDistanceToSegment(polyline[i], 
                                       polyline[i-1], 
                                       polyline[i+1]);
      if (d > epsilon){
        ret.push(polyline[i].slice());
      }   
    }
    ret.push(polyline[polyline.length-1].slice());
    return ret;
  }

  /**
   * Simplify contour using Douglas Peucker algorithm.
   * <p>   
   * Implements David Douglas and Thomas Peucker, 
   * "Algorithms for the reduction of the number of points required to 
   * represent a digitized line or its caricature", 
   * The Canadian Cartographer 10(2), 112–122 (1973)
   * @param  polyline  The vertices
   * @param  epsilon   Maximum allowed error
   * @return           A simplified copy
   * @see              approxPolySimple
   */
  that.approxPolyDP = function(polyline, epsilon){
    // https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
    // David Douglas & Thomas Peucker, 
    // "Algorithms for the reduction of the number of points required to 
    // represent a digitized line or its caricature", 
    // The Canadian Cartographer 10(2), 112–122 (1973)
    
    if (polyline.length <= 2){
      return polyline;
    }
    let dmax   = 0;
    let argmax = -1;
    for (let i = 1; i < polyline.length-1; i++){
      let d = pointDistanceToSegment(polyline[i], 
                                     polyline[0], 
                                     polyline[polyline.length-1]);
      if (d > dmax){
        dmax = d;
        argmax = i;
      }  
    }
    // console.log(dmax)
    let ret = [];
    if (dmax > epsilon){
      let L = that.approxPolyDP(polyline.slice(0,argmax+1),epsilon);
      let R = that.approxPolyDP(polyline.slice(argmax,polyline.length),epsilon);
      ret = ret.concat(L.slice(0,L.length-1)).concat(R);
    }else{
      ret.push(polyline[0].slice());
      ret.push(polyline[polyline.length-1].slice());
    }
    return ret;
  }
}