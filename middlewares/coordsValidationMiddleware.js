const fs = require('fs');
const path = require('path');
require('dotenv').config();

const coordsValidationMiddleware = (req, res, next) => {
try {
  const { client } = req.params;
  const codeCoordinate = req.headers['code-coord'];

  if (!codeCoordinate) {
    console.error({ error: 'No code coordinate provided' });
    return res.status(403).json({ error: 'No code coordinate provided' });
  }

  if (validateCoordinateCode(client,codeCoordinate)) {
    next();
  } else {
    return res.status(500).json({ error: 'Authentication Coords failed' });
  }    
  } catch (error) {
    console.error('Authentication Coords failed:', error);
    return res.status(500).json({ error: 'Authentication Coords failed' });
  }
};

const validateCoordinateCode = (clientId, coordinateCode) => {
    const clientDir = path.join(__dirname, '../clients', clientId);
    console.log(clientDir)
    const coordsPath = path.join(clientDir, 'coords.json');
  
    if (!fs.existsSync(coordsPath)) {
      console.error(`Coordinate card no found for client: ${clientId}`);
      throw new Error(`Coordinate card no found for client: ${clientId}`);
    }
  
    const coordinates = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
    const coordinate = coordinates.find(
      (c) => c.code === coordinateCode && !c.used
    );
  
    if (!coordinate) {
      console.error(`Coordinate code invalid or was used before`);
      throw new Error('Coordinate code invalid or was used before');
    }

    coordinate.used = true;
    coordinate.usedAt = new Date().toISOString();

    fs.writeFileSync(coordsPath, JSON.stringify(coordinates, null, 2));
  
    return true;
  };

  
module.exports = coordsValidationMiddleware;
  