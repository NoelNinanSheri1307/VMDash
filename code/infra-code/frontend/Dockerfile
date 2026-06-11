FROM mirror-registry.cloud.vssc.dos.gov.in:8443/ubi8/nginx-122

COPY build /opt/app-root/src
COPY nginx.conf /opt/app-root/etc/nginx.default.d/frontend.conf

USER root
RUN chmod -R g+rwX /opt/app-root/src
RUN chgrp -R 0 /opt/app-root/src
USER 1001

CMD ["nginx", "-g", "daemon off;"]