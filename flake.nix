{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Node.js version that matches project requirements
        nodejs = pkgs.nodejs_22;
        
        # Common packages needed for the project
        commonPackages = with pkgs; [
          nodejs
          yarn
          git
        ];
        
        # Development packages
        devPackages = with pkgs; [
          # TypeScript and linting tools
          nodePackages.typescript
          nodePackages.eslint
          
          # Testing tools - Playwright dependencies
          chromium
          firefox
          
          # System dependencies that might be needed
          pkg-config
          cairo
          pango
          libpng
          libjpeg
          giflib
          librsvg
        ];

        # FHS environment for compatibility with yarn packages that need system libraries
        fhs = pkgs.buildFHSEnv {
          name = "blue-sky-design-dev";
          targetPkgs = pkgs: commonPackages ++ devPackages ++ (with pkgs; [
            # Additional FHS packages for yarn modules
            stdenv.cc.cc
            zlib
            openssl
            curl
            wget
          ]);
          
          runScript = "bash";
          
          profile = ''
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export NODE_PATH=$PWD/node_modules
            
            # Helpful aliases
            alias dev="yarn dev"
            alias build="yarn build"
            alias lint="yarn lint"
            alias test="yarn test"
            alias storybook="yarn storybook"
            
            echo "🚀 Blue Sky Design development environment loaded!"
            echo "Available commands: dev, build, lint, test, storybook"
          '';
        };

      in
      {
        devShells = {
          default = fhs.env;
          
          # Alternative shell without FHS for lighter development
          native = pkgs.mkShell {
            buildInputs = commonPackages ++ devPackages;
            
            shellHook = ''
              echo "🚀 Blue Sky Design native development environment loaded!"
              echo "Run 'yarn install' to install dependencies"
            '';
          };
        };
        
        # Expose packages for easy access
        packages = {
          nodejs = nodejs;
          dev-env = fhs;
        };
      });
}
