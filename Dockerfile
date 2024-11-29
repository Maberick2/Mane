# Usa una imagen base de Node.js  
FROM node:20-alpine  

# Establece el directorio de trabajo  
WORKDIR /app  

# Actualiza los repositorios de Alpine e instala las dependencias necesarias  
RUN apk update && \
    apk add --no-cache git  

# Copia package.json y package-lock.json (si existe)  
COPY package*.json ./  

# Instala las dependencias usando npm  
RUN npm install  

# Copia el resto del código fuente  
COPY . .  

# Construye la aplicación  
RUN npm run build  

# Comando para ejecutar las pruebas  
CMD ["npm", "test"]