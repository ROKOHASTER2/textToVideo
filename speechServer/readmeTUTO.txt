----------- COMO USAR ---------------

1. docker load -i speechserver.tar
2. docker run -p 3000:3000 speechserver
3. lanzas un POST con /video-from-json o /video 

Para el video desde un JSON tienes que mandar :

-heritageData:con el objeto json
-targetLanguage:con el idioma que se quiera 
-targetLength: Si quiere la version extendida o corta del 
la descripcion del objeto Ocity

