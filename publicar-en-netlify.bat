@echo off
cd /d "%~dp0"
echo.
echo Publicando Bakery Box en Netlify (cuenta lunchboxsrl)...
echo Esto puede tardar varios minutos, no cierres esta ventana.
echo.
npx -y @netlify/mcp@latest --site-id 110c6fc5-bf7a-4f31-a193-951dd8bc899f --proxy-path "https://netlify-mcp.netlify.app/proxy/eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..SKo18G2zFznSuj1v.MXnyr8ZHl7mo9ncP0z2vSi5Bnrm-qY8D2u0U3429AqW2yth6P6UNHGvXxkGp8LCZ3f9KlpbVyCHfRWfR4bvkwIEOK_xEv6LN6seLN6SBezfjQZpZvoIVSu0JK3025iEE97gSZBvHyZdox_k3RbDmVgwNWoiU0TiE3UePUlKb7S_Zf8F67UCpCpuixNm3GU0nCnSFjpH-RTEWoMYpst2HE0ersLDuymLnzMViH3eYucQfZvrFvcvRVtizd76fNQ3A9UUQwFoeQrLgnTUmNmPgaJ5d7WS1jhIhUljbNNQcMGy9XzfZu7XAab7EaKmdHDhe6SO_UTQ6VeuVSZLsHFj0OM5boXo0BEeELIEsHr4H5AX-q3LNeOibSp7B2gu-a7j6umxbYPF7.r4y3PkHbw396JNyjwSXwHQ"
echo.
echo Listo. Fijate arriba la URL de tu sitio (deberia ser https://bakery-box.netlify.app).
pause
