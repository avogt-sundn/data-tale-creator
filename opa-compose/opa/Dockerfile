# Use the official OPA Docker image as the base image
FROM openpolicyagent/opa:1.9.0-static-debug


# Set the working directory inside the container
WORKDIR /app


# Expose the OPA API port
EXPOSE 8181


# Command to run OPA with the policies
CMD ["run", "--server", "--addr=0.0.0.0:8181","--log-level=debug","--log-format=text"]